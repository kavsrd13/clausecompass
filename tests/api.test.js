import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalyzeHandler } from "../api/analyze.js";
import { profile, now, airResponse, responseRecorder } from "./fixtures.js";
const req = () => ({
  method: "POST",
  headers: { host: "localhost", authorization: "Bearer test-only" },
  body: profile,
});
const config = () => ({ apiKey: "test-only", accessToken: "test-only" });
const ai = (priorities = ["community"]) => ({
  ok: true,
  json: async () => ({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify({ priorities }) }] },
      },
    ],
  }),
});
async function run(request = req(), changes = {}) {
  const response = responseRecorder();
  const handler = createAnalyzeHandler({
    config,
    now: () => now,
    fetcher: async (url) =>
      String(url).includes("air-quality-api")
        ? { ok: true, json: async () => airResponse() }
        : ai(),
    ...changes,
  });
  await handler(request, response);
  return response;
}
test("AI planner returns source-backed actions and mandatory safeguards", async () => {
  const r = await run();
  assert.equal(r.code, 200);
  assert.equal(r.body.ai, true);
  assert.equal(r.body.snapshot.kind, "modelled");
  assert.equal(r.body.actions[0].id, "reduce-exposure");
  assert.equal(r.headers["Cache-Control"], "no-store");
});
test("unsupported generated advice IDs are rejected", async () => {
  const r = await run(req(), {
    fetcher: async (url) =>
      String(url).includes("air-quality-api")
        ? { ok: true, json: async () => airResponse() }
        : ai(["buy-ozone-generator"]),
  });
  assert.equal(r.code, 502);
});
for (const [name, request, changes, status] of [
  ["method", { ...req(), method: "GET" }, {}, 405],
  [
    "origin",
    { ...req(), headers: { origin: "https://evil.test", host: "localhost" } },
    {},
    403,
  ],
  ["token", { ...req(), headers: { host: "localhost" } }, {}, 401],
  ["configuration", req(), { config: () => ({}) }, 503],
  ["input", { ...req(), body: {} }, {}, 400],
])
  test(`reject ${name}`, async () =>
    assert.equal((await run(request, changes)).code, status));
test("upstream quota is explicit and not silently guidance-only", async () => {
  const r = await run(req(), {
    fetcher: async (url) =>
      String(url).includes("air-quality-api")
        ? { ok: true, json: async () => airResponse() }
        : { ok: false, status: 429 },
  });
  assert.equal(r.code, 429);
});
test("safety blocked output is not accepted", async () => {
  const r = await run(req(), {
    fetcher: async (url) =>
      String(url).includes("air-quality-api")
        ? { ok: true, json: async () => airResponse() }
        : {
            ok: true,
            json: async () => ({ candidates: [{ finishReason: "SAFETY" }] }),
          },
  });
  assert.equal(r.code, 502);
});

test("Gemini receives eligible IDs and household preferences without coordinates or full guidance text", async () => {
  const calls = [];
  const result = await run(req(), {
    fetcher: async (url, options) => {
      if (String(url).includes("air-quality-api"))
        return Response.json(airResponse());
      const payload = JSON.parse(options.body);
      calls.push(payload);
      return ai(["community", "transit", "community"]);
    },
  });
  assert.equal(result.code, 200);
  assert.equal(calls.length, 1);
  const prompt = JSON.parse(calls[0].contents[0].parts[0].text);
  assert.equal(prompt.household.goal, profile.goal);
  assert.equal("latitude" in prompt.household, false);
  assert.equal("longitude" in prompt.household, false);
  assert.deepEqual(Object.keys(prompt.eligible[0]).sort(), ["id", "title"]);
  const ids = result.body.actions.map((action) => action.id);
  assert.deepEqual(ids.slice(0, 4), [
    "reduce-exposure",
    "clean-room",
    "community",
    "transit",
  ]);
  assert.equal(new Set(ids).size, ids.length);
});

for (const [label, failure] of [
  ["invalid JSON", () => new Response("incomplete")],
  [
    "missing content",
    () => Response.json({ candidates: [{ finishReason: "STOP" }] }),
  ],
  ["unknown action", () => ai(["unlisted-action"])],
  [
    "connection failure",
    () => {
      throw new TypeError("network unavailable");
    },
  ],
]) {
  test(`distinguishes Gemini ${label} from a forecast failure`, async () => {
    const response = await run(req(), {
      fetcher: async (url) =>
        String(url).includes("air-quality-api")
          ? Response.json(airResponse())
          : failure(),
    });
    assert.equal(response.code, 502);
    assert.match(response.body.error, /Gemini/);
  });
}

test("an unusable forecast stops the request before Gemini is contacted", async () => {
  const hosts = [];
  const response = await run(req(), {
    fetcher: async (url) => {
      hosts.push(new URL(url).hostname);
      return Response.json({ hourly: {} });
    },
  });
  assert.equal(response.code, 502);
  assert.match(response.body.error, /air-quality/);
  assert.deepEqual(hosts, ["air-quality-api.open-meteo.com"]);
});

test("the normal AI route uses its configured model and sends just the provider credential to Google", async (t) => {
  t.mock.property(process, "env", {
    ...process.env,
    GEMINI_API_KEY: "fixture-provider-key",
    APP_ACCESS_TOKEN: "test-only",
    GEMINI_MODEL: "fixture-model",
  });
  const response = responseRecorder();
  const handler = createAnalyzeHandler({
    now: () => now,
    fetcher: async (url, options) => {
      if (new URL(url).hostname === "air-quality-api.open-meteo.com")
        return Response.json(airResponse());
      assert.equal(
        new URL(url).pathname,
        "/v1beta/models/fixture-model:generateContent",
      );
      assert.equal(options.headers["x-goog-api-key"], "fixture-provider-key");
      assert.equal(new Headers(options.headers).has("Authorization"), false);
      return ai();
    },
  });
  await handler(req(), response);
  assert.equal(response.code, 200);
});

test("a non-quota Gemini outage tells the family which service is unavailable", async () => {
  const response = await run(req(), {
    fetcher: async (url) =>
      new URL(url).hostname === "air-quality-api.open-meteo.com"
        ? Response.json(airResponse())
        : new Response(null, { status: 503 }),
  });
  assert.equal(response.code, 502);
  assert.match(response.body.error, /Gemini is unavailable/);
});

test("a malformed origin is rejected before an external lookup", async () => {
  const response = await run({
    ...req(),
    headers: { ...req().headers, origin: "invalid origin" },
  });
  assert.equal(response.code, 403);
});
