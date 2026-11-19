import * as z from "zod/mini";
import { citySchema, locationSchema, MAX_CITY_RESULTS } from "../contracts.js";

const placeSchema = z.extend(locationSchema, {
  name: z.string().check(z.trim(), z.minLength(1)),
  admin1: z.optional(z.string()),
  country: z.optional(z.string()),
});
const geocodingSchema = z.object({
  error: z.optional(z.literal(false)),
  results: z._default(
    z.array(z.unknown()).check(z.maxLength(MAX_CITY_RESULTS)),
    [],
  ),
});

/** Keep a complete city name when its administrative qualifiers are too long for a profile.
 * @param {unknown} value */
function cityOption(value) {
  const place = placeSchema.safeParse(value);
  if (!place.success) return null;
  const { name, admin1, country, latitude, longitude } = place.data;
  for (const parts of [[name, admin1, country], [name, country], [name]]) {
    const label = [...new Set(parts.filter(Boolean))].join(", ");
    const city = citySchema.safeParse({ name: label, latitude, longitude });
    if (city.success) return city.data;
  }
  return null;
}

/** @param {string} query @param {typeof fetch} fetcher */
export async function findCities(query, fetcher) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query,
    count: String(MAX_CITY_RESULTS),
    language: "en",
    format: "json",
  }).toString();
  const response = await fetcher(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Geocoder unavailable");
  const { results } = geocodingSchema.parse(await response.json());
  const cities = results.map(cityOption).filter((city) => city !== null);
  if (results.length > 0 && cities.length === 0)
    throw new Error("Geocoder returned no usable records");
  return cities;
}
