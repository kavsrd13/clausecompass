import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
test("bundled app demo, impact and profile invalidation work together", async () => {
  const bundle = await build({
    entryPoints: ["main.js"],
    bundle: true,
    write: false,
    outdir: "dist-test",
    format: "iife",
    platform: "browser",
  });
  const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const dom = new JSDOM(readFileSync("index.html", "utf8"), {
    runScripts: "outside-only",
    url: "http://localhost",
  });
  try {
    dom.window.eval(js);
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
  } finally {
    dom.window.close();
  }
});
