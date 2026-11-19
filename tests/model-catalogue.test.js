import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { handleModels } from "../api/models.js";
import { responseRecorder } from "./fixtures.js";

async function requestModels(fetcher, apiKey = "fixture-provider-key") {
  const response = responseRecorder();
  await handleModels(
    { method: "GET", headers: { authorization: "Bearer fixture-app-token" } },
    response,
    { APP_ACCESS_TOKEN: "fixture-app-token", GEMINI_API_KEY: apiKey },
    fetcher,
  );
  return response;
}

test("model discovery lists only models that support generation", async () => {
  const response = await requestModels(async () =>
    Response.json({
      models: [
        {
          name: "models/text",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/embedding",
          supportedGenerationMethods: ["embedContent"],
        },
        { name: "models/unlisted" },
      ],
    }),
  );
  assert.equal(response.code, 200);
  assert.deepEqual(response.body.models, ["models/text"]);
});

test("discovery reports missing server configuration before calling Google", async () => {
  const fetcher = mock.fn();
  const response = await requestModels(fetcher, "");
  assert.equal(response.code, 503);
  assert.equal(fetcher.mock.callCount(), 0);
});

test("model discovery exposes the upstream status without forwarding its response body", async () => {
  const response = await requestModels(
    async () => new Response("upstream detail", { status: 503 }),
  );
  assert.equal(response.code, 502);
  assert.equal(response.body.providerStatus, 503);
  assert.doesNotMatch(JSON.stringify(response.body), /upstream detail/);
});

test("an unreadable model catalogue reports a provider failure", async () => {
  const response = await requestModels(async () =>
    Response.json({ models: [null] }),
  );
  assert.equal(response.code, 502);
  assert.equal(response.body.models, undefined);
});

test("model discovery follows opaque page tokens and returns each generation model once", async () => {
  const model = (name) => ({
    name,
    supportedGenerationMethods: ["generateContent"],
  });
  const tokens = [];
  const token = "next+/=";
  const response = await requestModels(async (url, options) => {
    tokens.push(url.searchParams.get("pageToken"));
    assert.equal(url.origin, "https://generativelanguage.googleapis.com");
    assert.equal(options.redirect, "error");
    return Response.json(
      tokens.length === 1
        ? { models: [model("models/a")], nextPageToken: token }
        : { models: [model("models/a"), model("models/b")] },
    );
  });
  assert.deepEqual(tokens, [null, token]);
  assert.deepEqual(response.body.models, ["models/a", "models/b"]);
});

test("a repeated page token or later outage cannot produce a partial catalogue", async () => {
  for (const lastPage of [
    Response.json({ models: [], nextPageToken: "repeat" }),
    new Response(null, { status: 503 }),
  ]) {
    const pages = [
      Response.json({ models: [], nextPageToken: "repeat" }),
      lastPage,
    ];
    const response = await requestModels(async () => pages.shift());
    assert.equal(response.code, 502);
    assert.equal(response.body.models, undefined);
    assert.equal(pages.length, 0);
  }
});
