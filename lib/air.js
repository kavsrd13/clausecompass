import { eligibleActions } from "./actions.js";
export { eligibleActions, SOURCES } from "./actions.js";
/** @import {Action, AirSnapshot, HouseholdProfile, Plan} from "./contracts.js" */

/** @param {number} aqi */
export function category(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) throw new RangeError("Invalid AQI");
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

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
    ai,
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
export function demoSnapshot(now = Date.now()) {
  const time = Math.floor(now / 3_600_000) * 3600;
  const current = { time, aqi: 235, pm25: 185 };
  const hours = Array.from({ length: 24 }, (_, i) => ({
    time: time + i * 3600,
    aqi: Math.round(current.aqi - 45 * Math.sin(i / 5)),
    pm25: Math.round(current.pm25 - 35 * Math.sin(i / 5)),
  }));
  return { kind: "demo", retrievedAt: now, current, hours };
}
