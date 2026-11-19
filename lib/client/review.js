/** @import {Action, AirSnapshot, Plan} from "../contracts.js" */

/** @template {keyof HTMLElementTagNameMap} K @param {Element} parent @param {K} tag @param {string} text */
function append(parent, tag, text = "") {
  const element = parent.ownerDocument.createElement(tag);
  element.textContent = text;
  parent.append(element);
  return element;
}

/** @param {HTMLElement} output @param {Action} item */
function renderAction(output, item) {
  const article = append(output, "article");
  append(article, "h4", `${item.mandatory ? "Priority · " : ""}${item.title}`);
  append(article, "p", item.action);
  append(article, "p", `Why this matters: ${item.impact}`);
  const link = append(article, "a", "Read supporting guidance");
  link.setAttribute("aria-label", `Read supporting guidance for ${item.title}`);
  link.href = item.source;
  link.rel = "noopener noreferrer";
}

/** @param {HTMLElement} output @param {AirSnapshot} snapshot */
function renderForecast(output, snapshot) {
  const fictional = snapshot.kind === "demo";
  const details = append(output, "details");
  append(
    details,
    "summary",
    fictional
      ? "Explore the fictional hourly scenario"
      : "Explore the hourly forecast",
  );
  const table = append(details, "table");
  const caption = append(
    table,
    "caption",
    `${fictional ? "Fictional" : "Modelled"} US AQI and PM2.5, device-local time`,
  );
  caption.className = "muted";
  const head = append(append(table, "thead"), "tr");
  for (const label of ["Time", "US AQI", "PM2.5 µg/m³"])
    append(head, "th", label).scope = "col";
  const body = append(table, "tbody");
  const hour = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (const row of snapshot.hours) {
    const tr = append(body, "tr");
    append(tr, "td", hour.format(row.time * 1000));
    append(tr, "td", String(row.aqi));
    append(tr, "td", String(row.pm25));
  }
}

/** @param {Document} document @param {Plan} plan */
export function renderReview(document, plan) {
  const output = document.getElementById("output");
  if (!output) return;
  output.replaceChildren();
  const { snapshot, context } = plan;
  const fictional = snapshot.kind === "demo";
  append(
    output,
    "h3",
    `${context.city} · ${fictional ? "Fictional scenario" : "Modelled outdoor air"}`,
  );
  append(
    output,
    "p",
    `US AQI ${snapshot.current.aqi} · ${plan.category} | PM2.5 ${snapshot.current.pm25} µg/m³`,
  );
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const times = `${date.format(snapshot.current.time * 1000)} · ${fictional ? "Created" : "Retrieved"} ${date.format(snapshot.retrievedAt)}`;
  append(
    output,
    "p",
    `Valid hour: ${times}. Times use this device's time zone.`,
  );
  append(output, "p", plan.warning);
  const metric = append(output, "div");
  metric.className = "impact";
  append(
    metric,
    "h3",
    `${plan.avoidedKm} km of solo driving could be replaced weekly`,
  );
  append(
    metric,
    "p",
    "The scenario assumes a shared or public journey on each selected travel day. Weekly solo-car distance = one-way km × 2 × days. Estimating emissions or exposure would require additional measurements.",
  );
  append(
    output,
    "h3",
    plan.ai ? "Your AI-prioritized routine" : "Your guidance-based routine",
  );
  for (const action of plan.actions) renderAction(output, action);
  renderForecast(output, snapshot);
}
