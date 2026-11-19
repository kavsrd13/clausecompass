import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAir } from "../lib/server/air.js";
import { now, airResponse } from "./fixtures.js";
const location = { latitude: 28, longitude: 77 };
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

test("mismatched, duplicate and reversed provider hours are rejected", async () => {
  const { hourly } = airResponse();
  for (const change of [
    { us_aqi: [99] },
    { time: [hourly.time[0], hourly.time[0], hourly.time[2]] },
    { time: [...hourly.time].reverse() },
  ]) {
    await assert.rejects(
      fetchAir(
        location,
        async () => Response.json({ hourly: { ...hourly, ...change } }),
        now,
      ),
      /time axis/,
    );
  }
});

test("missing hours stay missing and cannot extend the 24-hour forecast", async () => {
  const t = Math.floor(now / 3_600_000) * 3600;
  const hourly = {
    time: [t, t + 3600, t + 23 * 3600, t + 24 * 3600],
    us_aqi: [200, null, 180, 150],
    pm2_5: [80, 70, 65, 60],
  };
  const snapshot = await fetchAir(
    location,
    async () => Response.json({ hourly }),
    now,
  );
  assert.deepEqual(
    snapshot.hours.map((row) => row.time),
    [t, t + 23 * 3600],
  );
});
