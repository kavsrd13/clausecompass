import { test } from "node:test";
import assert from "node:assert/strict";
import models from "../api/models.js";
import { responseRecorder } from "./fixtures.js";

async function requestModels(t, fetcher, apiKey = "fixture-provider-key") {
  t.mock.property(process, "env", {
    ...process.env,
    APP_ACCESS_TOKEN: "fixture-app-token",
    GEMINI_API_KEY: apiKey,
  });
  t.mock.method(globalThis, "fetch", fetcher);
  const response = responseRecorder();
  await models(
    { method: "GET", headers: { authorization: "Bearer fixture-app-token" } },
    response,
  );
  return response;
}

test("model discovery lists only models that support generation", async (t) => {
  const response = await requestModels(t, async () =>
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

test("discovery reports missing server configuration before calling Google", async (t) => {
  const fetcher = t.mock.fn();
  const response = await requestModels(t, fetcher, "");
  assert.equal(response.code, 503);
  assert.equal(fetcher.mock.callCount(), 0);
});

test("model discovery exposes the upstream status without forwarding its response body", async (t) => {
  const response = await requestModels(
    t,
    async () => new Response("upstream detail", { status: 503 }),
  );
  assert.equal(response.code, 502);
  assert.equal(response.body.providerStatus, 503);
  assert.doesNotMatch(JSON.stringify(response.body), /upstream detail/);
});

test("an unreadable model catalogue reports a provider failure", async (t) => {
  const response = await requestModels(t, async () =>
    Response.json({ models: [null] }),
  );
  assert.equal(response.code, 502);
  assert.equal(response.body.models, undefined);
});
