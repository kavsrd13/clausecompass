import * as z from "zod/mini";

export const FORECAST_HOURS = 24;
export const SECONDS_PER_HOUR = 3_600;
const MAX_READING_AGE_MS = 90 * 60_000;
// ECMAScript Date's upper bound, also required by the renderer and Markdown export.
const MAX_DATE_MS = 8_640_000_000_000_000;

export const readingSchema = z.object({
  time: z
    .int()
    .check(z.gte(0), z.lte(MAX_DATE_MS / 1000), z.multipleOf(SECONDS_PER_HOUR)),
  aqi: z.number().check(z.gte(0), z.lte(1000)),
  pm25: z.number().check(z.gte(0), z.lte(3000)),
});

const snapshotFields = z.object({
  kind: z.enum(["modelled", "demo"]),
  retrievedAt: z.int().check(z.gte(0), z.lte(MAX_DATE_MS)),
  current: readingSchema,
  hours: z
    .array(readingSchema)
    .check(z.minLength(1), z.maxLength(FORECAST_HOURS)),
});

/** @param {z.infer<typeof snapshotFields>} snapshot */
function startsWithCurrentReading({ current, hours }) {
  const first = hours[0];
  return (
    first?.time === current.time &&
    first.aqi === current.aqi &&
    first.pm25 === current.pm25
  );
}

/** @param {z.infer<typeof snapshotFields>} snapshot */
function hasOrderedForecastHours({ current, hours }) {
  const endSeconds = current.time + FORECAST_HOURS * SECONDS_PER_HOUR;
  let previousSeconds = -1;
  for (const { time } of hours) {
    if (time <= previousSeconds || time >= endSeconds) return false;
    previousSeconds = time;
  }
  return true;
}

export const snapshotSchema = snapshotFields.check(
  z.refine(({ retrievedAt, current }) => {
    const ageMs = retrievedAt - current.time * 1000;
    return ageMs >= 0 && ageMs <= MAX_READING_AGE_MS;
  }, "The current reading must be fresh at retrieval."),
  z.refine(
    startsWithCurrentReading,
    "The first forecast hour must match the current reading.",
  ),
  z.refine(
    hasOrderedForecastHours,
    "Forecast hours must increase within the 24-hour window.",
  ),
);
