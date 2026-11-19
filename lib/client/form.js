import { requestSchema } from "../contracts.js";
/** @import {City} from "../contracts.js" */

/** @template {HTMLElement} T @param {string} id @param {new () => T} type @returns {T} */
export function element(id, type) {
  const control = document.getElementById(id);
  if (control instanceof type) return control;
  throw new Error(`Expected ${type.name} for #${id}`);
}

export const form = element("profile", HTMLFormElement);
export const citySelect = element("city", HTMLSelectElement);
export const searchInput = element("city-search", HTMLInputElement);
export const tokenInput = element("token", HTMLInputElement);
const sensitive = element("sensitive", HTMLInputElement);
const commute = element("commute", HTMLSelectElement);
const distance = element("distance", HTMLInputElement);
const days = element("days", HTMLInputElement);
const budget = element("budget", HTMLSelectElement);
const purifier = element("purifier", HTMLInputElement);
const cooking = element("cooking", HTMLSelectElement);
const goal = element("goal", HTMLTextAreaElement);

const presets = [
  { name: "New Delhi, India", latitude: 28.61, longitude: 77.21 },
  { name: "Mumbai, India", latitude: 19.08, longitude: 72.88 },
  { name: "Lahore, Pakistan", latitude: 31.55, longitude: 74.34 },
  { name: "London, United Kingdom", latitude: 51.51, longitude: -0.13 },
  { name: "New York, United States", latitude: 40.71, longitude: -74.01 },
  { name: "Beijing, China", latitude: 39.9, longitude: 116.4 },
];
/** @type {City[]} */
let cities = presets;

/** @param {City[]} matches */
export function showCities(matches = []) {
  const otherPresets = presets.filter(
    (preset) =>
      !matches.some(
        (city) =>
          city.latitude === preset.latitude &&
          city.longitude === preset.longitude,
      ),
  );
  cities = [...matches, ...otherPresets];
  citySelect.replaceChildren(
    ...cities.map((city, index) => new Option(city.name, String(index))),
  );
}

export function readProfile() {
  const city = cities[citySelect.selectedIndex];
  if (!city) throw new Error("Choose a city before building a plan.");
  return requestSchema.parse({
    city: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    sensitive: sensitive.checked,
    commute: commute.value,
    distanceKm: distance.valueAsNumber,
    days: days.valueAsNumber,
    budget: budget.value,
    purifier: purifier.checked,
    cooking: cooking.value,
    goal: goal.value,
  });
}
