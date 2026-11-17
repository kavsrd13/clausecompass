import { test } from "node:test";
import assert from "node:assert/strict";
import { requestSchema, resultSchema, verify } from "../lib/contracts.js";
test("reject short and oversized requests", () => {
  assert.equal(
    requestSchema.safeParse({ text: "bad", role: "Client" }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ text: "a".repeat(80001), role: "Client" })
      .success,
    false,
  );
});
test("source verification uses correct version and exact quote", () => {
  const result = {
    summary: "x",
    questions: [],
    findings: [
      { quote: "30 days", document: "original" },
      { quote: "60 days", document: "original" },
      { quote: "60 days", document: "revised" },
    ],
  };
  assert.equal(
    verify(result, { text: "Pay in 30 days", second: "Pay in 60 days" })
      .findings.length,
    2,
  );
});
test("empty citations cannot pass result schema", () => {
  assert.equal(
    resultSchema.safeParse({
      summary: "x",
      questions: [],
      findings: [
        { title: "x", explanation: "x", quote: "", document: "original" },
      ],
    }).success,
    false,
  );
});
