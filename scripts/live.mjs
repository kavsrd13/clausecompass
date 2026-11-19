import assert from "node:assert/strict";
import { planSchema } from "../lib/contracts.js";
import { eligibleActions } from "../lib/actions.js";
if (!process.env.APP_URL || !process.env.APP_ACCESS_TOKEN)
  throw Error(
    "Set APP_URL and APP_ACCESS_TOKEN for an explicitly configured running API.",
  );
const profile = {
  city: "New Delhi, India",
  latitude: 28.61,
  longitude: 77.21,
  sensitive: true,
  commute: "car",
  distanceKm: 8,
  days: 5,
  budget: "free",
  purifier: false,
  cooking: "gas",
  goal: "No-cost school pickup",
};
const response = await fetch(new URL("/api/analyze", process.env.APP_URL), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.APP_ACCESS_TOKEN}`,
  },
  body: JSON.stringify(profile),
  signal: AbortSignal.timeout(45000),
});
assert.equal(
  response.status,
  200,
  "Production personalization did not return HTTP 200",
);
const data = planSchema.parse(await response.json());
assert.equal(data.ai, true);
assert.equal(data.snapshot.kind, "modelled");
assert.equal(data.context.city, profile.city);
assert.equal(data.avoidedKm, 80);
const expected = eligibleActions(data.context, data.snapshot.current.aqi);
const actual = data.actions.map(({ id }) => id);
assert.deepEqual([...actual].sort(), expected.map(({ id }) => id).sort());
const mandatory = expected
  .filter((action) => action.mandatory)
  .map(({ id }) => id);
assert.deepEqual(actual.slice(0, mandatory.length), mandatory);
console.log(
  JSON.stringify({
    status: response.status,
    actions: data.actions.length,
    modelledHour: data.snapshot.current.time,
  }),
);
