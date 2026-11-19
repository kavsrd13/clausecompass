import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { lowestWindow, showTools } from "../lib/client/plan-tools.js";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { profile, now, responseRecorder } from "./fixtures.js";
import question from "../api/question.js";

test("window uses earliest minimum peak, includes the final hour and skips gaps", () => {
  const hours = [0, 1, 3, 4].map((h, i) => ({
    time: h * 3600,
    aqi: [170, 90, 90, 120][i],
    pm25: 1,
  }));
  assert.deepEqual(lowestWindow(hours, 0, 3, 2), { start: 10800, peak: 120 });
  assert.deepEqual(lowestWindow(hours, 0, 3, 1), { start: 3600, peak: 90 });
  assert.equal(lowestWindow(hours, 1, 2, 2), undefined);
});
test("family can compare windows, switch travel days and ask only about the active plan", async (t) => {
  const dom = new JSDOM(readFileSync("index.html", "utf8"));
  const win = dom.window;
  for (const name of [
    "document",
    "Option",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLButtonElement",
  ]) {
    Object.defineProperty(globalThis, name, {
      value: win[name],
      configurable: true,
    });
    t.after(() => {
      delete globalThis[name];
    });
  }
  t.after(() => win.close());
  const get = (id) => win.document.getElementById(id);
  const snapshot = demoSnapshot(now);
  let token = "";
  const controller = new AbortController();
  showTools(buildPlan(profile, snapshot), () => token, controller.signal);
  assert.match(get("window-result").textContent, /Fictional scenario/);
  get("window-start").selectedIndex = 2;
  get("window-end").selectedIndex = 0;
  get("window-end").onchange();
  assert.match(get("window-result").textContent, /No complete window/);
  get("switch-days").value = "3";
  get("switch-days").oninput();
  assert.match(get("commute-result").textContent, /Replaced: 48 km/);
  await get("ask-plan").onclick();
  assert.match(get("plan-answer").textContent, /Enter a question/);
  token = "fixture";
  get("plan-question").value = "What about travel?";
  const lookup = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ answer: "Travel answer" }),
  );
  await get("ask-plan").onclick();
  assert.match(get("plan-answer").textContent, /Travel answer/);
  lookup.mock.mockImplementation(
    async () => new Response(null, { status: 503 }),
  );
  await get("ask-plan").onclick();
  assert.match(get("plan-answer").textContent, /retry/);
  for (const reply of [
    Response.json({ error: "Unavailable" }, { status: 503 }),
    Response.json({ answer: null }),
  ]) {
    lookup.mock.mockImplementation(async () => reply);
    await get("ask-plan").onclick();
    assert.match(get("plan-answer").textContent, /retry/);
  }
  const live = {
    ...snapshot,
    kind: "modelled",
    hours: snapshot.hours.map((h) => ({ ...h, aqi: 20 })),
  };
  showTools(
    buildPlan({ ...profile, commute: "public" }, live),
    () => token,
    controller.signal,
  );
  assert.match(get("window-result").textContent, /Modelled forecast/);
  assert.equal(get("switch-days").disabled, true);
  const pending = Promise.withResolvers();
  lookup.mock.mockImplementation(() => pending.promise);
  get("plan-question").value = "What about travel?";
  const waiting = get("ask-plan").onclick();
  controller.abort();
  pending.resolve(Response.json({ answer: "obsolete" }));
  await waiting;
  assert.doesNotMatch(get("plan-answer").textContent, /obsolete/);
  get("switch-days").remove();
  assert.throws(
    () =>
      showTools(buildPlan(profile, snapshot), () => token, controller.signal),
    /Missing planner control/,
  );
});
test("question route protects access and returns only an eligible plan fact", async (t) => {
  const env = {
    APP_ACCESS_TOKEN: "fixture-token",
    GEMINI_API_KEY: "fixture-key",
  };
  const call = async (
    body,
    method = "POST",
    authorization = "Bearer fixture-token",
  ) => {
    const res = responseRecorder();
    await question({ method, headers: { authorization }, body }, res);
    return res;
  };
  t.mock.property(process, "env", { ...process.env, ...env });
  const body = {
    profile,
    snapshot: demoSnapshot(now),
    question: "How much solo driving?",
  };
  assert.equal((await call(body, "GET")).code, 405);
  assert.equal((await call(body, "POST", "")).code, 401);
  assert.equal((await call({ ...body, question: " " })).code, 400);
  const reply = (id) =>
    Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify({ priorities: [id] }) }] },
        },
      ],
    });
  const lookup = t.mock.method(globalThis, "fetch", async () =>
    reply("travel-distance"),
  );
  const res = await call(body);
  assert.equal(res.code, 200);
  assert.equal(res.body.kind, "demo");
  assert.match(res.body.answer, /80 km/);
  lookup.mock.mockImplementation(async () => reply("unknown"));
  assert.match((await call(body)).body.answer, /no evidence/);
  lookup.mock.mockImplementation(async () => reply("untrusted"));
  assert.equal((await call(body)).code, 502);
  process.env.GEMINI_API_KEY = "";
  assert.equal((await call(body)).code, 503);
});
