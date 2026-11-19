import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { activitySummary, lowestWindow } from "../lib/scenario.js";
import { askPlan } from "../lib/client/api.js";
import { createBrief } from "../lib/client/export.js";
import { showTools } from "../lib/client/plan-tools.js";
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
  const submitted = JSON.parse(lookup.mock.calls[0].arguments[1].body);
  assert.deepEqual(submitted.selection, {
    days: 3,
    first: 2,
    last: 0,
    duration: 1,
  });
  const previous = Promise.withResolvers();
  lookup.mock.mockImplementation(() => previous.promise);
  const oldQuestion = get("ask-plan").onclick();
  get("switch-days").value = "2";
  get("switch-days").oninput();
  previous.resolve(
    Response.json({ answer: "Answer for the old slider position" }),
  );
  await oldQuestion;
  assert.equal(get("plan-answer").textContent, "");
  assert.equal(get("ask-plan").disabled, false);
  lookup.mock.mockImplementation(
    async () => new Response(null, { status: 503 }),
  );
  await get("ask-plan").onclick();
  assert.match(get("plan-answer").textContent, /retry|try again|unavailable/i);
  for (const reply of [
    Response.json({ error: "Unavailable" }, { status: 503 }),
    Response.json({ answer: null }),
  ]) {
    lookup.mock.mockImplementation(async () => reply);
    await get("ask-plan").onclick();
    assert.match(
      get("plan-answer").textContent,
      /retry|try again|unavailable/i,
    );
  }
  const live = {
    ...snapshot,
    kind: "modelled",
    hours: snapshot.hours.map((h) => ({ ...h, aqi: 20 })),
  };
  let clock = now;
  t.mock.method(Date, "now", () => clock);
  let tick;
  t.mock.method(win, "setTimeout", (callback) => {
    tick = callback;
    return 1;
  });
  showTools(
    buildPlan({ ...profile, commute: "public" }, live),
    () => token,
    controller.signal,
  );
  assert.match(get("window-result").textContent, /Modelled forecast/);
  const firstRecommendation = get("window-result").textContent;
  clock += 3600000;
  tick();
  assert.notEqual(get("window-result").textContent, firstRecommendation);
  assert.equal(get("switch-days").disabled, true);
  const pending = Promise.withResolvers();
  lookup.mock.mockImplementation(() => pending.promise);
  get("plan-question").value = "What about travel?";
  const waiting = get("ask-plan").onclick();
  controller.abort();
  pending.resolve(Response.json({ answer: "obsolete" }));
  await waiting;
  assert.equal(get("plan-question").value, "");
  assert.equal(get("ask-plan").onclick, null);
  assert.equal(get("switch-days").oninput, null);
  assert.equal(get("window-start").onchange, null);
  assert.doesNotMatch(get("plan-answer").textContent, /obsolete/);
  get("switch-days").remove();
  assert.throws(
    () =>
      showTools(buildPlan(profile, snapshot), () => token, controller.signal),
    /Missing planner control/,
  );
});

test("an old current reading remains context but cannot become a future activity", () => {
  const snapshot = { ...demoSnapshot(now), kind: "modelled" };
  const base = snapshot.current.time;
  snapshot.hours = [0, 2, 3].map((offset, i) => ({
    time: base + 3600 * offset,
    aqi: 10 + i,
    pm25: 10,
  }));
  const range = { first: 0, last: 2, duration: 1 };
  for (const minutes of [15, 75]) {
    assert.match(
      activitySummary(snapshot, range, String, (base + minutes * 60) * 1000),
      new RegExp(String(base + 7200)),
    );
  }
  assert.match(
    activitySummary(snapshot, { ...range, last: 0 }, String, (base + 1) * 1000),
    /No complete/,
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
          content: { parts: [{ text: JSON.stringify({ factId: id }) }] },
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
  const selection = { days: 2, first: 0, last: 3, duration: 2 };
  for (const invalid of [
    { first: 24 },
    { last: 24 },
    { duration: 3 },
    { days: -1 },
  ]) {
    assert.equal(
      (await call({ ...body, selection: { ...selection, ...invalid } })).code,
      400,
    );
  }
  assert.equal(
    (
      await call({
        ...body,
        profile: { ...profile, commute: "public" },
        selection,
      })
    ).code,
    400,
  );
  assert.match(
    (await call({ ...body, selection })).body.answer,
    /Replaced: 32 km/,
  );
  assert.equal(
    (await call({ ...body, selection: { ...selection, days: 6 } })).code,
    400,
  );
  lookup.mock.mockImplementation(async () => reply("activity-window"));
  assert.match((await call({ ...body, selection })).body.answer, /UTC/);
  assert.match(
    (await call({ ...body, selection: { ...selection, first: 3, last: 1 } }))
      .body.answer,
    /No complete/,
  );
  lookup.mock.mockImplementation(
    async () => new Response(null, { status: 429 }),
  );
  assert.match((await call({ ...body, selection })).body.error, /quota/);
  lookup.mock.mockImplementation(async () => reply("unknown"));
  assert.match((await call(body)).body.answer, /no evidence/);
  lookup.mock.mockImplementation(async () => reply("untrusted"));
  assert.equal((await call(body)).code, 502);
  process.env.GEMINI_API_KEY = "";
  assert.equal((await call(body)).code, 503);
});

test("an expired live plan exports the selected commute but no past activity recommendation", () => {
  const plan = buildPlan(profile, {
    ...demoSnapshot(Date.UTC(2020, 0, 1)),
    kind: "modelled",
  });
  const brief = createBrief(plan, { first: 0, last: 3, duration: 1, days: 2 });
  assert.match(brief, /No complete window/);
  assert.match(brief, /Replaced: 32 km/);
});

test("questions distinguish a timeout from access and quota failures", async (t) => {
  const signal = AbortSignal.abort(
    new DOMException("Deadline", "TimeoutError"),
  );
  const lookup = t.mock.method(globalThis, "fetch", async () => {
    throw signal.reason;
  });
  await assert.rejects(askPlan({}, "fixture", signal), /timed out/);
  for (const [status, error] of [
    [401, "Enter the app access token."],
    [429, "Gemini quota reached."],
  ]) {
    lookup.mock.mockImplementation(async () =>
      Response.json({ error }, { status }),
    );
    await assert.rejects(askPlan({}, "fixture", new AbortController().signal), {
      message: error,
    });
  }
});
