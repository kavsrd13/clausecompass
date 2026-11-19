import { z } from "zod";
import {
  FORECAST_HOURS,
  SECONDS_PER_HOUR,
  snapshotSchema,
} from "../forecast.js";
const responseSchema = z.object({
  hourly: z.object({
    time: z.array(z.int().nonnegative()).max(48),
    us_aqi: z.array(z.number().nullable()).max(48),
    pm2_5: z.array(z.number().nullable()).max(48),
  }),
});
/** @param {z.infer<typeof responseSchema>["hourly"]} hourly @param {number} retrievedAtMs */
function forecastFromHourlySeries(hourly, retrievedAtMs) {
  const { time, us_aqi: indices, pm2_5: particles } = hourly;
  if (
    time.length !== indices.length ||
    time.length !== particles.length ||
    time.some((value, i) => {
      const previous = time[i - 1];
      return previous !== undefined && previous >= value;
    })
  ) {
    throw new Error("Air-quality series must share an ordered time axis");
  }
  const hours = time.flatMap((timestamp, i) => {
    const aqi = indices[i];
    const pm25 = particles[i];
    return typeof aqi === "number" && typeof pm25 === "number"
      ? [{ time: timestamp, aqi, pm25 }]
      : [];
  });
  const current = hours.findLast((row) => row.time * 1000 <= retrievedAtMs);
  if (!current)
    throw new Error("Air-quality data is missing for the current hour");
  const endSeconds = current.time + FORECAST_HOURS * SECONDS_PER_HOUR;
  return snapshotSchema.parse({
    kind: "modelled",
    retrievedAt: retrievedAtMs,
    current,
    hours: hours.filter(
      (row) => row.time >= current.time && row.time < endSeconds,
    ),
  });
}

/** @param {{latitude:number,longitude:number}} location @param {typeof fetch} fetcher @param {number} retrievedAtMs */
export async function fetchAir(
  location,
  fetcher = fetch,
  retrievedAtMs = Date.now(),
) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "us_aqi,pm2_5",
    forecast_days: "2",
    timezone: "GMT",
    timeformat: "unixtime",
  }).toString();
  const response = await fetcher(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error("Air-quality provider unavailable");
  const { hourly } = responseSchema.parse(await response.json());
  return forecastFromHourlySeries(hourly, retrievedAtMs);
}
