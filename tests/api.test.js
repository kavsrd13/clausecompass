import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalyzeHandler } from "../api/analyze.js";
import { profile, now, airResponse } from "./fixtures.js";
const req = () => ({
  method: "POST",
  headers: { host: "localhost", authorization: "Bearer test-only" },
  body: profile,
});
const config = () => ({ apiKey: "test-only", accessToken: "test-only" });
const res = () => ({
  code: 200,
  body: null,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(c) {
    this.code = c;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
});
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
  const response = res();
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
