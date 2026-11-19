import { test } from "node:test";
import assert from "node:assert/strict";
import air from "../api/air.js";
import locations from "../api/locations.js";
import models, { handleModels } from "../api/models.js";
import { snapshotSchema } from "../lib/contracts.js";
import { airResponse, now, profile, responseRecorder } from "./fixtures.js";

const request = {
  method: "POST",
  headers: { host: "localhost" },
  body: profile,
};

test("public forecast serves a validated snapshot and forwards only the forecast query", async (t) => {
  t.mock.method(Date, "now", () => now);
  const lookup = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.hostname, "air-quality-api.open-meteo.com");
    assert.deepEqual([...url.searchParams.keys()].sort(), [
      "forecast_days",
      "hourly",
      "latitude",
      "longitude",
      "timeformat",
      "timezone",
    ]);
    assert.equal(options.headers, undefined);
    return Response.json(airResponse());
  });
  const response = responseRecorder();
  await air(request, response);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(response.code, 200);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(snapshotSchema.parse(response.body).kind, "modelled");
});

test("public forecast distinguishes a bad request from an upstream outage", async (t) => {
  const lookup = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 503 }),
  );
  const invalid = responseRecorder();
  await air({ ...request, body: { latitude: 99, longitude: 0 } }, invalid);
  assert.equal(invalid.code, 400);
  assert.equal(lookup.mock.callCount(), 0);
  const unavailable = responseRecorder();
  await air(request, unavailable);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(unavailable.code, 502);
  assert.equal(unavailable.body.kind, undefined);
});

test("method and access checks run before any model or air lookup", async (t) => {
  const lookup = t.mock.method(globalThis, "fetch", async () =>
    Response.json({}),
  );
  const wrongMethod = responseRecorder();
  await air({ ...request, method: "GET" }, wrongMethod);
  assert.equal(wrongMethod.code, 405);
  assert.equal(wrongMethod.headers.Allow, "POST");
  for (const [handler, method, allowed] of [
    [models, "POST", "GET"],
    [locations, "GET", "POST"],
  ]) {
    const response = responseRecorder();
    await handler({ method, headers: {} }, response);
    assert.equal(response.code, 405);
    assert.equal(response.headers.Allow, allowed);
  }
  const unauthorized = responseRecorder();
  await models({ method: "GET", headers: { host: "localhost" } }, unauthorized);
  assert.equal(unauthorized.code, 401);
  assert.equal(
    unauthorized.headers["WWW-Authenticate"],
    'Bearer realm="AirWise"',
  );
  assert.equal(lookup.mock.callCount(), 0);
});

test("bearer authentication accepts case-insensitive schemes and rejects ambiguous headers", async (t) => {
  const config = {
    APP_ACCESS_TOKEN: "fixture-token",
    GEMINI_API_KEY: "fixture-key",
  };
  const lookup = t.mock.fn(async () => Response.json({ models: [] }));
  for (const [authorization, expected] of [
    ["bearer  fixture-token", 200],
    ["Bearer FIXTURE-TOKEN", 401],
    [["Bearer fixture-token"], 401],
    ["Basic fixture-token", 401],
  ]) {
    const response = responseRecorder();
    await handleModels(
      { method: "GET", headers: { authorization } },
      response,
      config,
      lookup,
    );
    assert.equal(response.code, expected);
  }
  assert.equal(lookup.mock.callCount(), 1);
});
