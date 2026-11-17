import "./style.css";
import { renderReview } from "./lib/client/review.js";
import { extractDocument } from "./lib/client/documents.js";
import { createBrief } from "./lib/client/export.js";
import { requestSchema, resultSchema } from "./lib/contracts.js";
const example =
  "FREELANCE SERVICES AGREEMENT\n\n1. Payment: The Client shall pay the Service Provider within 30 days after approval of an invoice.\n\n2. Ownership: Intellectual property transfers to the Client only after full payment.\n\n3. Termination: Either party may terminate on 14 days written notice.\n\n4. Liability: The Service Provider liability is capped at the total fees paid under this agreement.\n\n5. Confidentiality: Both parties must keep non-public business information confidential for two years.";
let result = null;
let mode = "";
let busy = false;
const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);
function show(data, label) {
  result = data;
  mode = label;
  renderReview(document, data, label);
}
$("example").onclick = () => {
  $("original").value = example;
  $("revised").value = example
    .replace("30 days", "60 days")
    .replace(
      "is capped at the total fees paid under this agreement",
      "is unlimited",
    );
  show(
    {
      summary:
        "This fictional service agreement covers payment, ownership, termination and confidentiality. The revision extends payment from 30 to 60 days and changes the stated liability cap. These stored example findings demonstrate the interface; they are not a live AI result.",
      findings: [
        {
          title: "A longer wait for payment",
          explanation:
            "The revised wording gives the Client 60 days after invoice approval. The approval condition remains important.",
          quote:
            "The Client shall pay the Service Provider within 60 days after approval of an invoice.",
          document: "revised",
        },
        {
          title: "Liability wording changes",
          explanation:
            "The original stated cap is replaced with unlimited liability. Discuss the scope and implications with a legal professional.",
          quote: "The Service Provider liability is unlimited.",
          document: "revised",
        },
      ],
      questions: [
        "How and when is invoice approval confirmed?",
        "What liability limit should the parties discuss?",
        "What payment is due if the agreement ends early?",
      ],
    },
    "STORED FICTIONAL EXAMPLE",
  );
};
async function run(question = "") {
  if (busy) return;
  const snapshot = JSON.stringify({
    text: $("original").value,
    second: $("revised").value,
    role: $("role").value,
  });
  const checked = requestSchema.safeParse({
    ...JSON.parse(snapshot),
    question,
  });
  if (!checked.success) {
    status(
      "Add at least 30 characters of document text and check the input limits.",
    );
    return;
  }
  busy = true;
  $("analyze").disabled = true;
  $("ask").disabled = true;
  $("question").disabled = true;
  status("Analyzing and checking source references…");
  document.querySelector(".results").setAttribute("aria-busy", "true");
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${$("token").value}`,
      },
      body: JSON.stringify(checked.data),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Request failed");
    if (
      snapshot !==
      JSON.stringify({
        text: $("original").value,
        second: $("revised").value,
        role: $("role").value,
      })
    ) {
      status("Input changed during analysis. Run a new review.");
      return;
    }
    const validated = resultSchema.parse(data);
    show({ ...validated, incomplete: data.incomplete === true }, "LIVE GEMINI");
  } catch (e) {
    status(e.message);
  } finally {
    busy = false;
    $("analyze").disabled = false;
    $("ask").disabled = false;
    $("question").disabled = false;
    document.querySelector(".results").setAttribute("aria-busy", "false");
  }
}
$("analyze").onclick = () => run();
$("ask").onclick = () => {
  if ($("question").value.trim()) run($("question").value);
  else status("Enter a question first.");
};
$("file").onchange = async (e) => {
  result = null;
  $("export").disabled = true;
  $("output").replaceChildren();
  try {
    const file = e.target.files[0];
    if (!file) return;
    $("original").value = await extractDocument(file);
    status("Text extracted locally. Review it before analysis.");
  } catch (e) {
    status(e.message);
  }
};
$("export").onclick = () => {
  if (!result) return;
  const text = createBrief(result, mode);
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "clausecompass-brief.md";
  a.click();
  URL.revokeObjectURL(url);
};
$("print").onclick = () => window.print();
$("clear").onclick = () => location.reload();
for (const id of ["original", "revised", "role"])
  $(id).addEventListener("input", () => {
    result = null;
    $("export").disabled = true;
    $("badge").textContent = "INPUT CHANGED";
    $("output").replaceChildren();
    status("Input changed. Run a new review.");
  });
