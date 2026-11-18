import assert from "node:assert/strict";
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
const r = await fetch(new URL("/api/analyze", process.env.APP_URL), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.APP_ACCESS_TOKEN}`,
  },
  body: JSON.stringify(profile),
  signal: AbortSignal.timeout(45000),
});
const data = await r.json();
assert.equal(r.status, 200, JSON.stringify(data));
assert.equal(data.ai, true);
assert.equal(data.snapshot.kind, "modelled");
assert.ok(data.actions.length > 0);
console.log(
  JSON.stringify({
    status: r.status,
    actions: data.actions.length,
    modelledHour: data.snapshot.current.time,
  }),
);
