import { before, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { demoSnapshot } from "../lib/air.js";
import { now } from "./fixtures.js";

let bundleText;
before(async () => {
  const bundle = await build({
    entryPoints: ["main.js"],
    bundle: true,
    write: false,
    outdir: "dist-test",
    format: "iife",
    platform: "browser",
  });
  bundleText = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
});

function openPlanner(t, fetcher) {
  const dom = new JSDOM(readFileSync("index.html", "utf8"), {
    runScripts: "outside-only",
    url: "http://localhost",
  });
  t.after(() => dom.window.close());
  dom.window.Headers = Headers;
  dom.window.fetch = fetcher;
  dom.window.eval(bundleText);
  return dom;
}

test("bundled app demo, impact and profile invalidation work together", (t) => {
  const dom = openPlanner(t);
  const doc = dom.window.document;
  assert.equal(doc.getElementById("city").options.length, 6);
  doc.getElementById("demo").click();
  assert.match(doc.getElementById("badge").textContent, /FICTIONAL/);
  assert.match(doc.getElementById("output").textContent, /80 km/);
  assert.equal(doc.getElementById("export").disabled, false);
  doc.getElementById("distance").value = "2";
  doc
    .getElementById("distance")
    .dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(doc.getElementById("output").textContent, "");
  assert.equal(doc.getElementById("export").disabled, true);
  doc.getElementById("demo").click();
  assert.match(doc.getElementById("output").textContent, /20 km/);
});

test("a late city search cannot replace a newer demo or its city", async (t) => {
  const pending = Promise.withResolvers();
  const dom = openPlanner(t, () => pending.promise);
  const doc = dom.window.document;
  doc.getElementById("city-search").value = "Pune";
  doc.getElementById("search").click();
  assert.equal(doc.getElementById("search").disabled, true);
  doc.getElementById("demo").click();
  pending.resolve(
    Response.json({
      locations: [{ name: "Pune, India", latitude: 18.52, longitude: 73.86 }],
    }),
  );
  await new Promise(setImmediate);
  assert.match(doc.getElementById("badge").textContent, /FICTIONAL/);
  assert.match(doc.getElementById("output").textContent, /New Delhi/);
  assert.equal(doc.getElementById("search-status").textContent, "");
  assert.equal(doc.getElementById("search").disabled, false);
});

test("a superseded forecast cannot overwrite a newly built household plan", async (t) => {
  const first = Promise.withResolvers();
  const second = Promise.withResolvers();
  const queue = [first, second];
  const dom = openPlanner(t, () => queue.shift().promise);
  const doc = dom.window.document;
  const modelled = { ...demoSnapshot(now), kind: "modelled" };
  doc.getElementById("guidance").click();
  doc.getElementById("distance").value = "2";
  doc
    .getElementById("distance")
    .dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  doc.getElementById("guidance").click();
  second.resolve(Response.json(modelled));
  await new Promise(setImmediate);
  first.resolve(Response.json(modelled));
  await new Promise(setImmediate);
  assert.match(doc.getElementById("output").textContent, /20 km/);
  assert.equal(doc.getElementById("output").getAttribute("aria-busy"), "false");
  assert.equal(doc.getElementById("export").disabled, false);
});
