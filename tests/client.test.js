import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { renderReview } from "../lib/client/review.js";
import { createBrief } from "../lib/client/export.js";
import { extractDocument } from "../lib/client/documents.js";
import { LIMITS } from "../lib/limits.js";
const review = {
  summary: "<img src=x onerror=alert(1)>",
  findings: [
    {
      title: "<script>bad()</script>",
      explanation: "Pay after approval.",
      quote: "Payment in 30 days",
      document: "original",
    },
  ],
  questions: ["When is approval?"],
};
test("renderer uses text nodes for untrusted model content", () => {
  const dom = new JSDOM(
    '<div id="badge"></div><div id="output"></div><button id="export" disabled></button><p id="status"></p>',
  );
  renderReview(dom.window.document, review, "LIVE");
  assert.equal(dom.window.document.querySelectorAll("img,script").length, 0);
  assert.ok(
    dom.window.document
      .getElementById("output")
      .textContent.includes(review.summary),
  );
  assert.equal(dom.window.document.getElementById("export").disabled, false);
  dom.window.close();
});
test("export preserves partial status, sources and questions", () => {
  const brief = createBrief({ ...review, incomplete: true }, "LIVE");
  assert.match(brief, /Incomplete/);
  assert.ok(brief.includes(review.findings[0].quote));
  assert.ok(brief.includes(review.questions[0]));
});
test("TXT length limit applies before replacing current document", async () => {
  await assert.rejects(
    extractDocument({
      name: "a.txt",
      size: 100,
      text: async () => "a".repeat(LIMITS.documentCharacters + 1),
    }),
    /too long/,
  );
});
test("file extension and signature validation do not start parser", async () => {
  await assert.rejects(
    extractDocument({ name: "a.exe", size: 1 }),
    /PDF or TXT/,
  );
  await assert.rejects(
    extractDocument({
      name: "a.pdf",
      size: 4,
      arrayBuffer: async () => new TextEncoder().encode("fake").buffer,
    }),
    /not a PDF/,
  );
});
const pdfFile = {
  name: "a.pdf",
  size: 100,
  arrayBuffer: async () => new TextEncoder().encode("%PDF-").buffer,
};
function fakeParser(doc) {
  let destroyed = 0;
  return {
    load: async () => ({
      getDocument: () => ({
        promise: Promise.resolve(doc),
        destroy: async () => {
          destroyed++;
        },
      }),
    }),
    destroyed: () => destroyed,
  };
}
test("too many PDF pages releases worker", async () => {
  const fake = fakeParser({ numPages: 21 });
  await assert.rejects(extractDocument(pdfFile, fake.load), /20 pages/);
  assert.equal(fake.destroyed(), 1);
});
test("image-only page releases worker", async () => {
  const fake = fakeParser({
    numPages: 1,
    getPage: async () => ({
      getTextContent: async () => ({ items: [{ str: "" }] }),
    }),
  });
  await assert.rejects(
    extractDocument(pdfFile, fake.load),
    /insufficient text/,
  );
  assert.equal(fake.destroyed(), 1);
});
test("valid PDF preserves page references and releases worker", async () => {
  const fake = fakeParser({
    numPages: 1,
    getPage: async () => ({
      getTextContent: async () => ({
        items: [{ str: "Payment is due after invoice approval." }],
      }),
    }),
  });
  const text = await extractDocument(pdfFile, fake.load);
  assert.match(text, /\[Page 1\]/);
  assert.match(text, /invoice approval/);
  assert.equal(fake.destroyed(), 1);
});
