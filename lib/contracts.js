import * as z from "zod/mini";

const cityName = z.string().check(z.trim(), z.minLength(2), z.maxLength(100));
const coordinates = {
  latitude: z.number().check(z.gte(-90), z.lte(90)),
  longitude: z.number().check(z.gte(-180), z.lte(180)),
};

export const locationSchema = z.object(coordinates);
export const citySchema = z.object({ name: cityName, ...coordinates });
export const MAX_CITY_RESULTS = 5;
export const searchSchema = z.object({
  query: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
});
export const citiesSchema = z.object({
  locations: z.array(citySchema).check(z.maxLength(MAX_CITY_RESULTS)),
});

export const requestSchema = z.object({
  city: cityName,
  ...coordinates,
  sensitive: z._default(z.boolean(), false),
  commute: z.enum(["car", "public", "active", "home"]),
  distanceKm: z.number().check(z.gte(0), z.lte(200)),
  days: z.int().check(z.gte(1), z.lte(7)),
  budget: z.enum(["free", "some"]),
  purifier: z.boolean(),
  cooking: z.enum(["electric", "gas", "solid"]),
  goal: z._default(z.string().check(z.trim(), z.maxLength(500)), ""),
});

export const readingSchema = z.object({
  time: z.int().check(z.gte(0)),
  aqi: z.number().check(z.gte(0), z.lte(1000)),
  pm25: z.number().check(z.gte(0), z.lte(3000)),
});
export const snapshotSchema = z.object({
  kind: z.enum(["modelled", "demo"]),
  retrievedAt: z.int().check(z.gte(0)),
  current: readingSchema,
  hours: z.array(readingSchema).check(z.minLength(1), z.maxLength(48)),
});

const actionSchema = z.object({
  id: z.string(),
  title: z.string(),
  action: z.string(),
  impact: z.string(),
  source: z.url({ protocol: /^https$/ }),
  mandatory: z.boolean(),
});
export const planSchema = z.object({
  snapshot: snapshotSchema,
  ai: z.boolean(),
  actions: z.array(actionSchema).check(z.minLength(1)),
  warning: z.string(),
  category: z.string(),
  avoidedKm: z.number().check(z.gte(0)),
  context: requestSchema,
});

/** @typedef {z.infer<typeof citySchema>} City */
/** @typedef {z.infer<typeof requestSchema>} HouseholdProfile */
/** @typedef {z.infer<typeof snapshotSchema>} AirSnapshot */
/** @typedef {z.infer<typeof actionSchema>} Action */
/** @typedef {z.infer<typeof planSchema>} Plan */
