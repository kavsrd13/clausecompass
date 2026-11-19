import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { renderReview } from "../lib/client/review.js";
import { createBrief } from "../lib/client/export.js";
import { loadGuidance, searchCities } from "../lib/client/api.js";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { profile } from "./fixtures.js";
test("untrusted city text is escaped and modelled data labelled", () => {
  const dom = new JSDOM('<div id="output"></div>');
  const plan = buildPlan(
    { ...profile, city: "<img src=x onerror=alert(1)>" },
    demoSnapshot(),
  );
  renderReview(dom.window.document, plan);
  assert.equal(dom.window.document.querySelectorAll("img,script").length, 0);
  assert.match(dom.window.document.body.textContent, /Fictional/);
  assert.match(dom.window.document.body.textContent, /US AQI/);
  assert.ok(
    dom.window.document.querySelectorAll('th[scope="col"]').length === 3,
  );
  dom.window.close();
});
test("export carries provenance, scope and travel assumptions", () => {
  const brief = createBrief(buildPlan(profile, demoSnapshot()));
  for (const expected of [
    "demo",
    "US AQI",
    "not a carbon",
    "not medical advice",
    "https://",
  ])
    assert.ok(brief.includes(expected));
});
test("all labelled form controls exist and IDs are unique", () => {
  const dom = new JSDOM(readFileSync("index.html", "utf8"));
  const document = dom.window.document;
  for (const label of document.querySelectorAll("label[for]"))
    assert.ok(document.getElementById(label.htmlFor));
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(document.documentElement.lang, "en");
  dom.window.close();
});

test("public planner sends only coordinates and renders and exports live provenance", async (t) => {
  const snapshot = { ...demoSnapshot(), kind: "modelled" };
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/air");
    assert.equal(options.redirect, "error");
    assert.deepEqual(JSON.parse(options.body), {
      latitude: profile.latitude,
      longitude: profile.longitude,
    });
    assert.equal(options.headers.has("authorization"), false);
    return Response.json(snapshot);
  });
  const plan = await loadGuidance(profile, new AbortController().signal);
  const dom = new JSDOM('<div id="output"></div>');
  t.after(() => dom.window.close());
  renderReview(dom.window.document, plan);
  assert.match(dom.window.document.body.textContent, /Modelled outdoor air/);
  assert.match(createBrief(plan), /Open-Meteo/);
  assert.match(createBrief(plan), /Retrieved/);
});

test("public planner rejects fictional readings from the live endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(demoSnapshot()));
  await assert.rejects(
    loadGuidance(profile, new AbortController().signal),
    /modelled air/,
  );
});

test("city search distinguishes an empty result from invalid data and service errors", async (t) => {
  const responses = [
    Response.json({ locations: [] }),
    Response.json({ cities: [] }),
    Response.json({ error: "Retry city search" }, { status: 503 }),
    new Response("Unavailable", { status: 503 }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift());
  const search = () => searchCities("Pune", new AbortController().signal);
  assert.deepEqual(await search(), []);
  await assert.rejects(search(), /incomplete data/);
  await assert.rejects(search(), /Retry city search/);
  await assert.rejects(search(), /Service unavailable/);
});
