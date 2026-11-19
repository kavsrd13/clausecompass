import { eligibleActions } from "./actions.js";
import { category } from "./aqi.js";
import { FORECAST_HOURS, SECONDS_PER_HOUR } from "./forecast.js";
export { eligibleActions, SOURCES } from "./actions.js";
export { category } from "./aqi.js";
/** @import {Action, AirSnapshot, HouseholdProfile, Plan} from "./contracts.js" */

/**
 * Preserve the catalogue order within mandatory actions and within unranked actions.
 * @param {Action[]} actions @param {string[]} priorities
 */
export function orderActions(actions, priorities) {
  const ordered = actions.filter((action) => action.mandatory);
  const remaining = new Map(
    actions
      .filter((action) => !action.mandatory)
      .map((action) => [action.id, action]),
  );
  for (const id of priorities) {
    const action = remaining.get(id);
    if (action) {
      ordered.push(action);
      remaining.delete(id);
    }
  }
  return [...ordered, ...remaining.values()];
}

/** @param {HouseholdProfile} profile @param {AirSnapshot} snapshot @param {string[]} priorities @param {boolean} ai @returns {Plan} */
export function buildPlan(profile, snapshot, priorities = [], ai = false) {
  return {
    context: profile,
    snapshot,
    ai: ai && snapshot.kind === "modelled",
    category: category(snapshot.current.aqi),
    actions: orderActions(
      eligibleActions(profile, snapshot.current.aqi),
      priorities,
    ),
    avoidedKm:
      profile.commute === "car"
        ? Math.round(profile.distanceKm * 2 * profile.days * 10) / 10
        : 0,
    warning:
      "General pollution-prevention information, not medical advice. Follow local official advisories. For severe breathing difficulty, chest pain, confusion or fainting, seek urgent medical help. No AQI category guarantees zero risk.",
  };
}

/** @returns {AirSnapshot} */
export function demoSnapshot(nowMs = Date.now()) {
  const hourStartSeconds =
    Math.floor(nowMs / (SECONDS_PER_HOUR * 1000)) * SECONDS_PER_HOUR;
  const current = { time: hourStartSeconds, aqi: 235, pm25: 185 };
  const hours = Array.from({ length: FORECAST_HOURS }, (_, i) => ({
    time: hourStartSeconds + i * SECONDS_PER_HOUR,
    aqi: Math.round(current.aqi - 45 * Math.sin(i / 5)),
    pm25: Math.round(current.pm25 - 35 * Math.sin(i / 5)),
  }));
  return { kind: "demo", retrievedAt: nowMs, current, hours };
}
