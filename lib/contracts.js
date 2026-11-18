import { z } from "zod";
export const requestSchema = z.object({
  city: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sensitive: z.boolean().default(false),
  commute: z.enum(["car", "public", "active", "home"]),
  distanceKm: z.number().min(0).max(200),
  days: z.number().int().min(1).max(7),
  budget: z.enum(["free", "some"]),
  purifier: z.boolean(),
  cooking: z.enum(["electric", "gas", "solid"]),
  goal: z.string().trim().max(500).default(""),
});
export const resultSchema = z.object({
  priorities: z.array(z.string().min(1).max(40)).min(1).max(8),
});
export const locationSchema = requestSchema.pick({
  latitude: true,
  longitude: true,
});
export const readingSchema = z.object({
  time: z.number().finite(),
  aqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(3000),
});
export const snapshotSchema = z.object({
  kind: z.enum(["modelled", "demo"]),
  retrievedAt: z.number(),
  current: readingSchema,
  hours: z.array(readingSchema).min(1).max(48),
});
export const planSchema = z.object({
  snapshot: snapshotSchema,
  ai: z.boolean(),
  actions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      action: z.string(),
      impact: z.string(),
      source: z.string().url(),
      mandatory: z.boolean(),
    }),
  ),
  warning: z.string(),
  category: z.string(),
  avoidedKm: z.number().min(0),
  context: requestSchema,
});
