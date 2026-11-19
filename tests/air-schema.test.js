import { test } from "node:test";
import assert from "node:assert/strict";
import { planSchema, snapshotSchema } from "../lib/contracts.js";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { now, profile } from "./fixtures.js";
test("demo passes full response schema", () =>
  assert.ok(planSchema.safeParse(buildPlan(profile, demoSnapshot())).success));
test("negative or missing outdoor readings fail", () => {
  const snapshot = demoSnapshot();
  snapshot.current.aqi = -1;
  assert.equal(snapshotSchema.safeParse(snapshot).success, false);
});

test("a forecast can contain gaps between hourly readings", () => {
  const snapshot = demoSnapshot(now);
  snapshot.hours = [snapshot.hours[0], snapshot.hours[3], snapshot.hours[23]];
  assert.ok(snapshotSchema.safeParse(snapshot).success);
});

test("the 90-minute freshness limit includes its exact boundary", () => {
  const snapshot = demoSnapshot(now);
  snapshot.retrievedAt = snapshot.current.time * 1000 + 90 * 60_000;
  assert.ok(snapshotSchema.safeParse(snapshot).success);
});

test("a fictional plan keeps its demo provenance even when priorities are supplied", () => {
  const demo = buildPlan(profile, demoSnapshot(now), ["community"], true);
  assert.equal(demo.ai, false);
  assert.equal(planSchema.safeParse({ ...demo, ai: true }).success, false);
});

for (const [reason, modify] of [
  [
    "unrenderable retrieval date",
    (snapshot) => {
      snapshot.retrievedAt = Number.MAX_SAFE_INTEGER;
    },
  ],
  [
    "unrenderable forecast hour",
    (snapshot) => {
      snapshot.hours[1].time = Number.MAX_SAFE_INTEGER;
    },
  ],
  [
    "conflicting current concentration",
    (snapshot) => {
      snapshot.current.pm25 += 1;
    },
  ],
  [
    "future current reading",
    (snapshot) => {
      snapshot.retrievedAt = snapshot.current.time * 1000 - 1;
    },
  ],
  [
    "current reading over 90 minutes old at retrieval",
    (snapshot) => {
      snapshot.retrievedAt = snapshot.current.time * 1000 + 90 * 60_000 + 1;
    },
  ],
  [
    "repeated hour",
    (snapshot) => {
      snapshot.hours[1].time = snapshot.current.time;
    },
  ],
  [
    "off-hour entry",
    (snapshot) => {
      snapshot.hours[1].time += 1;
    },
  ],
  [
    "entry past the 24-hour horizon",
    (snapshot) => {
      snapshot.hours.at(-1).time += 3600;
    },
  ],
]) {
  test(`the shared forecast contract rejects: ${reason}`, () => {
    const snapshot = { ...demoSnapshot(now), kind: "modelled" };
    modify(snapshot);
    assert.equal(snapshotSchema.safeParse(snapshot).success, false, reason);
  });
}
