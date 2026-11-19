import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocationsHandler } from "../api/locations.js";
import { citiesSchema, requestSchema } from "../lib/contracts.js";
import { profile, responseRecorder } from "./fixtures.js";

const place = {
  name: "São Paulo",
  admin1: "São Paulo",
  country: "Brazil",
  latitude: -23.55,
  longitude: -46.63,
};
async function search(query, fetcher) {
  const response = responseRecorder();
  await createLocationsHandler(fetcher)(
    { method: "POST", headers: {}, body: { query } },
    response,
  );
  return response;
}

test("city search preserves accents and returns usable, deduplicated place labels", async () => {
  const response = await search("  São Paulo  ", async (url) => {
    assert.equal(url.hostname, "geocoding-api.open-meteo.com");
    assert.equal(url.searchParams.get("name"), place.name);
    assert.equal(url.searchParams.get("count"), "5");
    return Response.json({ results: [place] });
  });
  assert.equal(response.code, 200);
  assert.deepEqual(citiesSchema.parse(response.body).locations, [
    {
      name: "São Paulo, Brazil",
      latitude: place.latitude,
      longitude: place.longitude,
    },
  ]);
});

test("long administrative names do not produce a city the planner rejects", async () => {
  const response = await search("São Paulo", async () =>
    Response.json({ results: [{ ...place, admin1: "A".repeat(100) }] }),
  );
  const [city] = response.body.locations;
  assert.equal(city.name, "São Paulo, Brazil");
  assert.ok(
    requestSchema.safeParse({
      ...profile,
      city: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    }).success,
  );
});

test("no matches, invalid provider results and service failures stay distinguishable", async () => {
  const empty = await search("Atlantis", async () =>
    Response.json({ generationtime_ms: 1 }),
  );
  assert.equal(empty.code, 200);
  assert.deepEqual(empty.body.locations, []);
  for (const payload of [
    { results: [{ ...place, latitude: 100 }] },
    { results: "invalid" },
    { results: [{}, {}] },
  ]) {
    assert.equal(
      (await search("São Paulo", async () => Response.json(payload))).code,
      502,
    );
  }
  assert.equal(
    (await search("São Paulo", async () => new Response(null, { status: 503 })))
      .code,
    502,
  );
});

test("invalid city queries are rejected before contacting the geocoder", async () => {
  let calls = 0;
  for (const query of [" ", "x", "x".repeat(81), 100]) {
    assert.equal(
      (
        await search(query, async () => {
          calls++;
          return Response.json({});
        })
      ).code,
      400,
    );
  }
  assert.equal(calls, 0);
});
