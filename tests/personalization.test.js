import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { loadPersonalization } from "../lib/client/api.js";
import { createBrief } from "../lib/client/export.js";
import { now, profile } from "./fixtures.js";

function modelledPlan() {
  return buildPlan(
    profile,
    { ...demoSnapshot(now), kind: "modelled" },
    ["community"],
    true,
  );
}

function receivePlan(t, response) {
  t.mock.method(globalThis, "fetch", async () => Response.json(response));
  return loadPersonalization(
    profile,
    new AbortController().signal,
    "test-only",
  );
}

test("a guidance-only response cannot be presented as AI personalization", async (t) => {
  const response = { ...modelledPlan(), ai: false };
  await assert.rejects(
    receivePlan(t, response),
    /personalization is unavailable/,
  );
});

for (const [field, value] of [
  ["city", "London"],
  ["budget", "some"],
  ["goal", "A different household goal"],
]) {
  test(`the planner rejects an AI response for a different household ${field}`, async (t) => {
    const response = modelledPlan();
    response.context = { ...response.context, [field]: value };
    await assert.rejects(receivePlan(t, response), /household/i);
  });
}

test("AI ordering preserves the catalogue's guidance, sources, travel calculation and mandatory precautions", async (t) => {
  const response = modelledPlan();
  response.category = "Wrong category";
  response.avoidedKm = 0;
  response.warning = "Unreviewed warning";
  response.actions = response.actions.toReversed().map((action) => ({
    ...action,
    title: "Unreviewed title",
    source: "https://example.org/",
    mandatory: false,
  }));
  const plan = await receivePlan(t, response);
  assert.match(createBrief(plan), /AI-prioritized/);
  const expected = modelledPlan();
  assert.equal(plan.avoidedKm, 80);
  assert.equal(plan.category, expected.category);
  assert.equal(plan.warning, expected.warning);
  assert.deepEqual(plan.actions.slice(0, 2), expected.actions.slice(0, 2));
  const optional = expected.actions.filter((action) => !action.mandatory);
  assert.deepEqual(plan.actions.slice(2), optional.toReversed());
});

for (const kind of ["missing", "duplicate", "unknown"]) {
  test(`a complete family plan rejects ${kind} action IDs`, async (t) => {
    const response = modelledPlan();
    if (kind === "missing") response.actions.pop();
    if (kind === "duplicate") response.actions.push(response.actions[0]);
    if (kind === "unknown")
      response.actions[0] = { ...response.actions[0], id: "unknown-action" };
    await assert.rejects(receivePlan(t, response), /actions/i);
  });
}
