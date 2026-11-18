import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAir } from "../lib/server/air.js";
import { now, airResponse } from "./fixtures.js";
test("read current model hour with provenance and fixed provider host", async () => {
  const snapshot = await fetchAir(
    { latitude: 28, longitude: 77 },
    async (url) => {
      assert.equal(url.hostname, "air-quality-api.open-meteo.com");
      return { ok: true, json: async () => airResponse() };
    },
    now,
  );
  assert.equal(snapshot.kind, "modelled");
  assert.equal(snapshot.current.aqi, 235);
  assert.equal(snapshot.hours.length, 2);
});
test("missing and stale data fail instead of becoming a demo", async () => {
  for (const data of [
    { hourly: { time: [], us_aqi: [], pm2_5: [] } },
    { hourly: { time: [1], us_aqi: [100], pm2_5: [20] } },
    {
      hourly: { time: [Math.floor(now / 1000)], us_aqi: [null], pm2_5: [null] },
    },
  ])
    await assert.rejects(
      fetchAir(
        { latitude: 1, longitude: 1 },
        async () => ({ ok: true, json: async () => data }),
        now,
      ),
    );
});
test("provider failure and negative pollutant data rejected", async () => {
  await assert.rejects(
    fetchAir({ latitude: 1, longitude: 1 }, async () => ({ ok: false }), now),
  );
  const data = airResponse();
  data.hourly.pm2_5[1] = -3;
  await assert.rejects(
    fetchAir(
      { latitude: 1, longitude: 1 },
      async () => ({ ok: true, json: async () => data }),
      now,
    ),
  );
});
