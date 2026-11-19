import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { now, profile } from "./fixtures.js";

function supportedHouseholds() {
  const choices = {
    sensitive: [false, true],
    commute: ["car", "public", "active", "home"],
    budget: ["free", "some"],
    purifier: [false, true],
    cooking: ["electric", "gas", "solid"],
  };
  let households = [profile];
  for (const [field, values] of Object.entries(choices)) {
    households = households.flatMap((household) =>
      values.map((value) => ({ ...household, [field]: value })),
    );
  }
  return households;
}

// Values immediately on either side of each published US AQI category boundary.
const boundaryCases = [
  { aqi: 50, sensitive: false, general: false },
  { aqi: 51, sensitive: false, general: false },
  { aqi: 100, sensitive: false, general: false },
  { aqi: 101, sensitive: true, general: false },
  { aqi: 150, sensitive: true, general: false },
  { aqi: 151, sensitive: true, general: true },
  { aqi: 200, sensitive: true, general: true },
  { aqi: 201, sensitive: true, general: true },
  { aqi: 300, sensitive: true, general: true },
  { aqi: 301, sensitive: true, general: true },
];

test("every supported household keeps its mandatory precautions when Gemini prefers community action", () => {
  const households = supportedHouseholds();
  const reference = demoSnapshot(now);
  for (const boundary of boundaryCases) {
    const current = { ...reference.current, aqi: boundary.aqi };
    const snapshot = {
      ...reference,
      kind: "modelled",
      current,
      hours: [current],
    };
    for (const household of households) {
      const plan = buildPlan(
        household,
        snapshot,
        ["community", "community"],
        true,
      );
      const reason = JSON.stringify({ household, aqi: boundary.aqi });
      const needsPrecautions = household.sensitive
        ? boundary.sensitive
        : boundary.general;
      const required = [];
      if (needsPrecautions) {
        required.push("reduce-exposure", "clean-room");
        if (household.commute === "active") required.push("active-travel");
      }
      const ids = plan.actions.map(({ id }) => id);
      assert.deepEqual(
        ids.slice(0, required.length + 1),
        [...required, "community"],
        reason,
      );
      assert.deepEqual(
        plan.actions.filter((action) => action.mandatory).map(({ id }) => id),
        required,
        reason,
      );
      assert.equal(new Set(ids).size, ids.length, reason);
    }
  }
});
