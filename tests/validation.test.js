import { test } from "node:test";
import assert from "node:assert/strict";
import { requestSchema, resultSchema } from "../lib/contracts.js";
const input = {
  text: "Payment is due 30 days after invoice approval.",
  role: "Client",
};
const result = {
  summary: "Payment summary",
  findings: [
    {
      title: "Payment",
      explanation: "Payment follows approval.",
      quote: "invoice approval",
      document: "original",
    },
  ],
  questions: [],
};
test("reject whitespace-only source and question excess", () => {
  assert.equal(
    requestSchema.safeParse({ ...input, text: " ".repeat(100) }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...input, question: "q".repeat(1001) }).success,
    false,
  );
});
test("reject blank finding labels, summaries and whitespace quotes", () => {
  for (const value of [
    { ...result, summary: " " },
    { ...result, findings: [{ ...result.findings[0], title: " " }] },
    { ...result, findings: [{ ...result.findings[0], quote: "   " }] },
  ])
    assert.equal(resultSchema.safeParse(value).success, false);
});
test("preserve quote whitespace rather than altering source provenance", () => {
  const value = {
    ...result,
    findings: [{ ...result.findings[0], quote: " invoice approval " }],
  };
  assert.equal(
    resultSchema.parse(value).findings[0].quote,
    " invoice approval ",
  );
});
