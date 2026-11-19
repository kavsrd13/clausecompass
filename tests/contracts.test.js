import { test } from "node:test";
import assert from "node:assert/strict";
import { requestSchema, planSchema } from "../lib/contracts.js";
import {
  category,
  eligibleActions,
  applyRanking,
  buildPlan,
  demoSnapshot,
} from "../lib/air.js";
import { profile } from "./fixtures.js";
for (const [aqi, name] of [
  [0, "Good"],
  [50, "Good"],
  [51, "Moderate"],
  [100, "Moderate"],
  [101, "Unhealthy for sensitive groups"],
  [150, "Unhealthy for sensitive groups"],
  [151, "Unhealthy"],
  [200, "Unhealthy"],
  [201, "Very unhealthy"],
  [300, "Very unhealthy"],
  [301, "Hazardous"],
])
  test(`US AQI boundary ${aqi}`, () => assert.equal(category(aqi), name));
test("reject non-finite and negative AQI", () => {
  for (const n of [-1, NaN, Infinity]) assert.throws(() => category(n));
});
test("reject invalid household and location inputs", () => {
  for (const changes of [
    { latitude: 91 },
    { longitude: 181 },
    { distanceKm: -1 },
    { days: 8 },
    { goal: "x".repeat(501) },
    { city: " " },
    { commute: "jet" },
    { distanceKm: NaN },
  ])
    assert.equal(
      requestSchema.safeParse({ ...profile, ...changes }).success,
      false,
    );
});
test("ranking a modelled plan preserves the original guidance and required actions", () => {
  const snapshot = { ...demoSnapshot(), kind: "modelled" };
  const guidance = buildPlan(profile, snapshot);
  const original = structuredClone(guidance);
  const ranked = applyRanking(guidance, ["community", "transit", "made-up"]);
  assert.deepEqual(guidance, original);
  assert.deepEqual(
    ranked.actions.slice(0, 3).map(({ id }) => id),
    ["reduce-exposure", "clean-room", "community"],
  );
  assert.deepEqual(new Set(ranked.actions), new Set(guidance.actions));
  assert.equal(ranked.ai, true);
  assert.ok(planSchema.safeParse(ranked).success);
});
test("sensitive households trigger precautions earlier", () => {
  assert.ok(eligibleActions(profile, 110)[0].mandatory);
  assert.equal(
    eligibleActions({ ...profile, sensitive: false }, 110)[0].mandatory,
    false,
  );
});
test("good-air routine does not unconditionally move activity indoors", () => {
  const a = eligibleActions(profile, 40)[0];
  assert.equal(a.mandatory, false);
  assert.match(a.action, /before outdoor/);
});
test("carbon and health percentages are never fabricated", () => {
  const plan = buildPlan(profile, demoSnapshot());
  assert.equal(plan.avoidedKm, 80);
  for (const mode of ["public", "active", "home"])
    assert.equal(
      buildPlan({ ...profile, commute: mode }, demoSnapshot()).avoidedKm,
      0,
    );
  assert.ok(!JSON.stringify(plan.actions).includes("%"));
});
test("active commute on heavy smog does not promote strenuous cycling", () => {
  const a = eligibleActions({ ...profile, commute: "active" }, 240).find(
    (a) => a.id === "active-travel",
  );
  assert.ok(a.mandatory);
  assert.match(a.action, /avoids prolonged exertion/);
});
test("gas and solid-fuel profiles receive combustion caveats", () => {
  for (const cooking of ["gas", "solid"])
    assert.ok(
      eligibleActions({ ...profile, cooking }, 230).some(
        (a) => a.id === "cooking",
      ),
    );
  assert.ok(
    !eligibleActions({ ...profile, cooking: "electric" }, 230).some(
      (a) => a.id === "cooking",
    ),
  );
});

test("budget changes eligible purchase options", () => {
  assert.ok(
    !eligibleActions({ ...profile, budget: "free" }, 230).some(
      (a) => a.id === "filter-option",
    ),
  );
  assert.ok(
    eligibleActions({ ...profile, budget: "some", purifier: false }, 230).some(
      (a) => a.id === "filter-option",
    ),
  );
  assert.ok(
    !eligibleActions({ ...profile, budget: "some", purifier: true }, 230).some(
      (a) => a.id === "filter-option",
    ),
  );
});
