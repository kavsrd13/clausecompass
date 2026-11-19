import { test } from "node:test";
import assert from "node:assert/strict";
import air, { MAX_SHARED_FORECASTS } from "../api/air.js";
import { airResponse, now, responseRecorder } from "./fixtures.js";

// Each upstream request stays pending until the test supplies a reply.
function mockForecastProvider(t) {
  const lookups = [];
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", (url) => {
    const { promise, resolve, reject } = Promise.withResolvers();
    lookups.push({
      url,
      succeed: () => resolve(Response.json(airResponse())),
      fail: () => reject(new Error("Provider offline")),
    });
    return promise;
  });
  return lookups;
}

async function requestForecast(latitude, longitude = 0, extra = {}) {
  const response = responseRecorder();
  await air(
    { method: "POST", headers: {}, body: { latitude, longitude, ...extra } },
    response,
  );
  return response;
}

test("20 overlapping requests for the same coordinates make one upstream call, then the next call refreshes", async (t) => {
  const lookups = mockForecastProvider(t);
  const requests = Array.from({ length: 20 }, (_, i) =>
    requestForecast(18.52, 73.86, { goal: `Household ${i}` }),
  );
  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].url.searchParams.has("goal"), false);
  lookups[0].succeed();
  const responses = await Promise.all(requests);
  for (const response of responses) {
    assert.equal(response.code, 200);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.deepEqual(response.body, responses[0].body);
  }
  const refresh = requestForecast(18.52, 73.86);
  assert.equal(lookups.length, 2);
  lookups[1].succeed();
  assert.equal((await refresh).code, 200);
});

test("different coordinates finish independently and a failed shared lookup can be retried", async (t) => {
  const lookups = mockForecastProvider(t);
  const first = requestForecast(10, 20);
  const same = requestForecast(10, 20);
  const other = requestForecast(10, 20.00001);
  assert.equal(lookups.length, 2);
  lookups[1].succeed();
  assert.equal((await other).code, 200);
  lookups[0].fail();
  for (const response of await Promise.all([first, same])) {
    assert.equal(response.code, 502);
  }
  const retry = requestForecast(10, 20);
  assert.equal(lookups.length, 3);
  lookups[2].succeed();
  assert.equal((await retry).code, 200);
});

test("at capacity, tracked locations still share and new locations can proceed independently", async (t) => {
  const lookups = mockForecastProvider(t);
  const requests = Array.from({ length: MAX_SHARED_FORECASTS }, (_, i) =>
    requestForecast(0, i / MAX_SHARED_FORECASTS),
  );
  requests.push(requestForecast(0, 0), requestForecast(1), requestForecast(1));
  assert.equal(lookups.length, MAX_SHARED_FORECASTS + 2);
  lookups[0].succeed();
  await requests[0];

  requests.push(requestForecast(2), requestForecast(2));
  assert.equal(lookups.length, MAX_SHARED_FORECASTS + 3);
  for (const lookup of lookups.slice(1)) lookup.succeed();
  for (const response of await Promise.all(requests))
    assert.equal(response.code, 200);
});
