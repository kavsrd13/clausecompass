import { SECONDS_PER_HOUR } from "./forecast.js";
/** @import {AirSnapshot, HouseholdProfile} from "./contracts.js" */
/** @param {AirSnapshot["hours"]} hours @param {number} first @param {number} last @param {number} duration */
export function lowestWindow(hours, first, last, duration, earliestMs = 0) {
  let best;
  for (let i = first; i + duration - 1 <= last; i++) {
    const rows = hours.slice(i, i + duration);
    const start = rows[0];
    if (
      !start ||
      start.time * 1000 < earliestMs ||
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
/** @param {AirSnapshot} snapshot @param {Pick<import("./question-contract.js").Selection,"first"|"last"|"duration">} selection @param {(seconds:number)=>string} format @param {number} nowMs */
export function activitySummary(
  snapshot,
  { first, last, duration },
  format = utcTime,
  nowMs = Date.now(),
) {
  const earliest = snapshot.kind === "demo" ? snapshot.retrievedAt : nowMs;
  const best = lowestWindow(snapshot.hours, first, last, duration, earliest);
  if (!best)
    return "No complete window fits. Widen the range, shorten the activity, or refresh the forecast.";
  return `Selected activity window: ${format(best.start)} to ${format(best.start + duration * SECONDS_PER_HOUR)}. Lowest peak forecast US AQI: ${best.peak}. ${best.peak > 100 ? "Even this window has elevated pollution. " : ""}Check local advisories.`;
}
/** @param {number} seconds */
function utcTime(seconds) {
  return new Date(seconds * 1000).toISOString() + " (UTC)";
}
