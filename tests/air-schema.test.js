import { test } from "node:test";
import assert from "node:assert/strict";
import { planSchema, snapshotSchema } from "../lib/contracts.js";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { profile } from "./fixtures.js";
test("demo passes full response schema", () =>
  assert.ok(planSchema.safeParse(buildPlan(profile, demoSnapshot())).success));
test("negative or missing outdoor readings fail", () => {
  const snapshot = demoSnapshot();
  snapshot.current.aqi = -1;
  assert.equal(snapshotSchema.safeParse(snapshot).success, false);
});
