import assert from "node:assert/strict";
const text =
  "The Client shall pay the Service Provider within 30 days after approval of an invoice. Either party may terminate on 14 days written notice. Liability is capped at the total fees paid.";
const cases = [
  { name: "review", second: "", question: "" },
  {
    name: "comparison",
    second: text
      .replace("30 days", "60 days")
      .replace(
        "Liability is capped at the total fees paid.",
        "Liability is unlimited.",
      ),
    question: "",
  },
  {
    name: "missing information",
    second: "",
    question:
      "What exact refund period is specified? If it is not in the document, say so.",
  },
];
for (const c of cases) {
  const start = Date.now();
  const r = await fetch(
    (process.env.APP_URL || "https://clausecompass-self.vercel.app") +
      "/api/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.APP_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        text,
        role: "Service provider",
        second: c.second,
        question: c.question,
      }),
    },
  );
  const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  assert.equal(d.incomplete, false);
  for (const f of d.findings)
    assert.ok((f.document === "original" ? text : c.second).includes(f.quote));
  if (c.name === "comparison") assert.match(JSON.stringify(d), /60/);
  if (c.name === "missing information")
    assert.match(
      d.summary,
      /not (specified|stated|located|provided|mentioned|included)|does not|no refund|absent|unspecified/i,
    );
  console.log(
    JSON.stringify({
      case: c.name,
      status: "passed",
      milliseconds: Date.now() - start,
      findings: d.findings.length,
      summary: d.summary,
    }),
  );
}
