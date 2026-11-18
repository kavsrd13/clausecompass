/** @param {Document} document @param {import('zod').infer<typeof import('../contracts.js').planSchema>} plan */
export function renderReview(document, plan) {
  const output = document.getElementById("output");
  if (!output) return;
  output.replaceChildren();
  const add = (tag, text, parent = output) => {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  };
  add(
    "h3",
    `${plan.context.city} · ${plan.snapshot.kind === "demo" ? "Fictional scenario" : "Modelled outdoor air"}`,
  );
  add(
    "p",
    `US AQI ${Math.round(plan.snapshot.current.aqi)} · ${plan.category} | PM2.5 ${plan.snapshot.current.pm25} µg/m³`,
  );
  add(
    "p",
    `Valid hour: ${new Date(plan.snapshot.current.time * 1000).toLocaleString()} · Retrieved: ${new Date(plan.snapshot.retrievedAt).toLocaleString()}. Times use this device's time zone. Forecast grid values can differ from street-level measurements.`,
  );
  add("p", plan.warning);
  const metric = add("div", "");
  metric.className = "impact";
  add(
    "h3",
    `${plan.avoidedKm} km of solo driving could be replaced weekly`,
    metric,
  );
  add(
    "p",
    "Scenario: replace every selected travel day with a shared/public journey. Calculation = one-way km × 2 × days (solo-car baseline only). This is planned solo-car travel replaced, not measured CO₂, total traffic reduction or AQI improvement.",
    metric,
  );
  add(
    "h3",
    plan.ai ? "Your AI-prioritized routine" : "Your guidance-based routine",
  );
  for (const item of plan.actions) {
    const article = add("article", "");
    add("h3", `${item.mandatory ? "Priority · " : ""}${item.title}`, article);
    add("p", item.action, article);
    add("p", `Why this matters: ${item.impact}`, article);
    const link = add("a", "Read supporting guidance", article);
    link.href = item.source;
    link.rel = "noopener noreferrer";
  }
  const details = add("details", "");
  add("summary", "Next forecast hours · lower does not mean safe", details);
  const table = add("table", "", details);
  const caption = add(
    "caption",
    "Modelled US AQI and PM2.5; device-local time",
    table,
  );
  caption.className = "muted";
  const head = add("tr", "", add("thead", "", table));
  for (const label of ["Time", "US AQI", "PM2.5 µg/m³"]) {
    const th = add("th", label, head);
    th.scope = "col";
  }
  const body = add("tbody", "", table);
  for (const row of plan.snapshot.hours.slice(0, 12)) {
    const tr = add("tr", "", body);
    add(
      "td",
      new Date(row.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tr,
    );
    add("td", String(Math.round(row.aqi)), tr);
    add("td", String(row.pm25), tr);
  }
}
