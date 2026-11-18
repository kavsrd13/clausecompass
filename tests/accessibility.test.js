import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import axe from "axe-core";
import { renderReview } from "../lib/client/review.js";
import { buildPlan, demoSnapshot } from "../lib/air.js";
import { profile } from "./fixtures.js";
for (const populated of [false, true])
  test(`automated accessibility structure (${populated ? "plan" : "empty"})`, async () => {
    const dom = new JSDOM(readFileSync("index.html", "utf8"), {
      runScripts: "outside-only",
      url: "http://localhost",
    });
    try {
      if (populated)
        renderReview(dom.window.document, buildPlan(profile, demoSnapshot()));
      dom.window.eval(axe.source);
      const results = await dom.window.axe.run(dom.window.document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
        rules: { "color-contrast": { enabled: false } },
      });
      assert.equal(
        results.violations.length,
        0,
        JSON.stringify(results.violations.map((v) => v.id)),
      );
    } finally {
      dom.window.close();
    }
  });
