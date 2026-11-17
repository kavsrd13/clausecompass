export function renderReview(document, data, label) {
  const $ = (id) => document.getElementById(id);
  const status = (text) => ($("status").textContent = text);
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
