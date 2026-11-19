import { needsSmogPrecautions } from "./aqi.js";
import {
  activeTravel,
  cleanerRoom,
  cookingSmoke,
  outdoorActivity,
  standardAction,
} from "./guidance.js";
export { SOURCES } from "./guidance.js";
/** @import {HouseholdProfile, Action} from "./contracts.js" */

/** @param {HouseholdProfile} profile @param {number} aqi @returns {Action[]} */
export function eligibleActions(profile, aqi) {
  const needsPrecautions = needsSmogPrecautions(aqi, profile.sensitive);
  const actions = [
    outdoorActivity(needsPrecautions),
    cleanerRoom({ hasCleaner: profile.purifier, needsPrecautions }),
  ];
  if (profile.budget === "some" && !profile.purifier) {
    actions.push(standardAction("filter-option"));
  }
  actions.push(standardAction("smoke-sources"), standardAction("ventilation"));
  if (profile.commute === "car") actions.push(standardAction("transit"));
  if (profile.commute === "active")
    actions.push(activeTravel(needsPrecautions));
  if (profile.cooking !== "electric")
    actions.push(cookingSmoke(profile.cooking));
  actions.push(standardAction("community"));
  return actions;
}
