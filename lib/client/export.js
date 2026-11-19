import { activitySummary, commuteSummary } from "../scenario.js";
/** @param {import("../contracts.js").Plan} plan @param {import("../question-contract.js").Selection} [selection] */
export function createBrief(plan, selection) {
  const { snapshot, context } = plan;
  const fictional = snapshot.kind === "demo";
  const provenance = fictional
    ? "The demo uses a fictional winter-smog scenario."
    : "Outdoor data: Open-Meteo / CAMS model forecasts. https://open-meteo.com/en/docs/air-quality-api";
  const readings = [
    `Mode: ${snapshot.kind}; ${plan.ai ? "AI-prioritized" : "guidance only"}`,
    `US AQI: ${snapshot.current.aqi} (${plan.category})`,
    `PM2.5: ${snapshot.current.pm25} µg/m³`,
    `Valid hour: ${new Date(snapshot.current.time * 1000).toISOString()}`,
    `${fictional ? "Created" : "Retrieved"}: ${new Date(snapshot.retrievedAt).toISOString()}`,
    provenance,
  ].join("\n");
  const actions = plan.actions.map((action) =>
    [
      `## ${action.title}`,
      action.action,
      `Impact: ${action.impact}`,
      `Source: ${action.source}`,
    ].join("\n"),
  );
  return [
    "# AirWise family smog-day plan",
    context.city,
    readings,
    plan.warning,
    ...actions,
    ...(selection
      ? [
          "## Your selected scenario",
          commuteSummary(context, selection.days),
          activitySummary(snapshot, selection),
        ]
      : []),
    "## Full-week travel opportunity",
    `${plan.avoidedKm} km of solo driving could be replaced weekly: one-way distance × 2 × days, only for a solo-car baseline. This is not a carbon, health or AQI reduction estimate.`,
    "Use local official advisories when applying the US AQI guidance.",
  ].join("\n\n");
}
