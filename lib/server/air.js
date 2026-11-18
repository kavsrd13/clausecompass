import { z } from "zod";
import { snapshotSchema } from "../contracts.js";
const responseSchema = z.object({
  hourly: z.object({
    time: z.array(z.number()),
    us_aqi: z.array(z.number().nullable()),
    pm2_5: z.array(z.number().nullable()),
  }),
});
/** @param {{latitude:number,longitude:number}} location @param {typeof fetch} fetcher @param {number} now */
export async function fetchAir(location, fetcher = fetch, now = Date.now()) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "us_aqi,pm2_5",
    forecast_days: "2",
    timezone: "GMT",
    timeformat: "unixtime",
  }).toString();
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error("Air-quality provider unavailable");
  const { hourly } = responseSchema.parse(await response.json());
  const hours = hourly.time
    .map((time, i) => ({ time, aqi: hourly.us_aqi[i], pm25: hourly.pm2_5[i] }))
    .filter(
      (row) =>
        row.aqi !== null &&
        row.aqi !== undefined &&
        row.pm25 !== null &&
        row.pm25 !== undefined,
    );
  const current = hours.filter((row) => row.time * 1000 <= now).at(-1);
  if (!current || now - current.time * 1000 > 5400000)
    throw Error("Air-quality data is missing or stale");
  return snapshotSchema.parse({
    kind: "modelled",
    retrievedAt: now,
    current,
    hours: hours.filter((row) => row.time >= current.time).slice(0, 24),
  });
}
