import { SECONDS_PER_HOUR } from "./forecast.js";
/** @import {AirSnapshot, HouseholdProfile} from "./contracts.js" */
/** @param {AirSnapshot["hours"]} hours @param {number} first @param {number} last @param {number} duration */
export function lowestWindow(hours, first, last, duration) {
  let best;
  for (let i = first; i + duration - 1 <= last; i++) {
    const rows = hours.slice(i, i + duration);
    const start = rows[0];
    if (
      !start ||
      rows.length !== duration ||
      rows.some((r, j) => r.time !== start.time + j * SECONDS_PER_HOUR)
    )
      continue;
    const peak = Math.max(...rows.map((r) => r.aqi));
    if (!best || peak < best.peak) best = { start: start.time, peak };
  }
  return best;
}

/** @param {HouseholdProfile} profile @param {number} days */
export function soloDistance(profile, days) {
  return profile.commute === "car"
    ? Math.round(profile.distanceKm * 2 * days * 10) / 10
    : 0;
}
/** @param {HouseholdProfile} profile @param {number} days */
export function commuteSummary(profile, days) {
  if (profile.commute !== "car")
    return "Your baseline has no solo-car commute to replace.";
  const baseline = soloDistance(profile, profile.days);
  const replaced = soloDistance(profile, days);
  return `${days} switched days. Baseline: ${baseline} km of solo driving. Proposed: ${Math.round((baseline - replaced) * 10) / 10} km. Replaced: ${replaced} km per week.`;
}
