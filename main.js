import "./style.css";
import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
const example =
  "FREELANCE SERVICES AGREEMENT\n\n1. Payment: The Client shall pay the Service Provider within 30 days after approval of an invoice.\n\n2. Ownership: Intellectual property transfers to the Client only after full payment.\n\n3. Termination: Either party may terminate on 14 days written notice.\n\n4. Liability: The Service Provider liability is capped at the total fees paid under this agreement.\n\n5. Confidentiality: Both parties must keep non-public business information confidential for two years.";
let result = null;
let mode = "";
let busy = false;
document.querySelector("#app").innerHTML =
  `<header><a class="brand" href="/">◈ ClauseCompass</a><span class="pill">LEGAL INFORMATION, MADE CLEAR</span></header><main id="workspace"><section class="intro"><span class="eyebrow">A CLEARER WAY FORWARD</span><h1>Understand before<br>you <em>sign.</em></h1><p>Find the commitments. See what changed. Arrive at your next conversation prepared.</p><div class="steps"><span>01 Understand</span><span>02 Compare</span><span>03 Prepare</span></div></section><div class="workspace"><section class="card"><div class="section-head"><h2>Your documents</h2><button id="example" class="secondary">Try fictional example</button></div><p class="muted">PDF text is extracted in your browser. Live analysis sends extracted text to Gemini. Use fictional or non-confidential information.</p><label for="role">I am reviewing as</label><select id="role"><option>Neutral reviewer</option><option>Service provider</option><option>Client</option><option>Tenant</option><option>Employee</option></select><label for="file">Add a text PDF or TXT · up to 5 MB / 20 pages</label><input id="file" type="file" accept=".pdf,.txt"><label for="original">Original document / extracted text</label><textarea id="original" placeholder="Paste your agreement here…" rows="10" maxlength="80000"></textarea><details><summary>Add a revised version to compare</summary><label for="revised">Revised document text</label><textarea id="revised" rows="7" maxlength="80000" placeholder="Paste revised wording…"></textarea></details><details><summary>Live access settings</summary><label for="token">Deployment access token (kept in memory)</label><input id="token" type="password" autocomplete="off"><p class="muted">The Gemini credential stays on the server. Ask the deployment owner for access.</p></details><div class="actions"><button id="analyze">Understand document ↗</button><button id="clear" class="secondary">Clear workspace</button></div></section><section class="card results" aria-busy="false"><div class="section-head"><h2>Your review</h2><span id="badge" class="pill">READY WHEN YOU ARE</span></div><p id="status" role="status">Start with a document or explore the fictional example.</p><div id="output"><div class="empty">◈<h3>Clarity starts here</h3><p>Your overview, source passages and preparation questions will appear here.</p></div></div><label for="question">Ask about these documents</label><input id="question" maxlength="1000" placeholder="What happens if payment is late?"><div class="actions"><button id="ask" class="secondary">Ask a question</button><button id="export" class="secondary" disabled>Export brief ↓</button><button id="print" class="secondary">Print</button></div></section></div><footer>Information and preparation assistance, not professional legal advice. Interpretations can be incomplete. Source quotes establish provenance, not legal correctness.</footer></main>`;
const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);
function show(data, label) {
  result = data;
  mode = label;
  $("badge").textContent = label;
  $("output").replaceChildren();
  const p = document.createElement("p");
  p.textContent = data.summary;
  $("output").append(p);
  for (const f of data.findings) {
    const a = document.createElement("article");
    const h = document.createElement("h3");
    h.textContent = f.title;
    const e = document.createElement("p");
    e.textContent = f.explanation;
    const d = document.createElement("details");
    const s = document.createElement("summary");
    s.textContent = `Show source · ${f.document}`;
    const q = document.createElement("blockquote");
    q.textContent = f.quote;
    d.append(s, q);
    a.append(h, e, d);
    $("output").append(a);
  }
  const h = document.createElement("h3");
  h.textContent = "Questions to prepare";
  const ul = document.createElement("ul");
  for (const q of data.questions) {
    const li = document.createElement("li");
    li.textContent = q;
    ul.append(li);
  }
  $("output").append(h, ul);
  $("export").disabled = false;
  status(
    data.incomplete
      ? "Partial review: some model references could not be validated."
      : "Review available. Read the supporting text and check uncertainties.",
  );
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
  busy = true;
  status("Analyzing and checking source references…");
  document.querySelector(".results").setAttribute("aria-busy", "true");
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${$("token").value}`,
      },
      body: JSON.stringify({
        text: $("original").value,
        second: $("revised").value,
        role: $("role").value,
        question,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Request failed");
    show(data, "LIVE GEMINI");
  } catch (e) {
    status(e.message);
  } finally {
    busy = false;
    document.querySelector(".results").setAttribute("aria-busy", "false");
  }
}
$("analyze").onclick = () => run();
$("ask").onclick = () => {
  if ($("question").value.trim()) run($("question").value);
  else status("Enter a question first.");
};
$("file").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) throw Error("Choose a file smaller than 5 MB.");
    if (file.name.toLowerCase().endsWith(".txt"))
      $("original").value = await file.text();
    else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
        throw Error("This file is not a PDF.");
      const doc = await pdfjs.getDocument({
        data: bytes,
        isEvalSupported: false,
      }).promise;
      if (doc.numPages > 20)
        throw Error("Choose a PDF with 20 pages or fewer.");
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const line = content.items.map((t) => t.str).join(" ");
        if (line.trim().length < 20)
          throw Error(
            `Page ${i} has insufficient text. Paste readable text instead.`,
          );
        text += `\n[Page ${i}]\n${line}\n`;
      }
      await doc.destroy();
      if (text.length > 80000)
        throw Error("Extracted text is too long. Use a smaller section.");
      $("original").value = text;
    }
    status("Text extracted locally. Review it before analysis.");
  } catch (e) {
    status(e.message);
  }
};
$("export").onclick = () => {
  if (!result) return;
  const text = `# Before You Sign brief\n\nMode: ${mode}\n\n${result.summary}\n\n${result.findings.map((f) => `## ${f.title}\n${f.explanation}\n\nSource (${f.document}): ${f.quote}`).join("\n\n")}\n\n## Questions\n${result.questions.map((q) => "- " + q).join("\n")}\n\nInformation only; not professional legal advice.`;
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
