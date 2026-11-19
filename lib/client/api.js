import { citiesSchema, planSchema, snapshotSchema } from "../contracts.js";
import { buildPlan } from "../air.js";
/** @import {HouseholdProfile} from "../contracts.js" */

/**
 * @template T
 * @param {string} path @param {unknown} body @param {import("zod/mini").ZodMiniType<T>} schema
 * @param {AbortSignal} signal @param {string} token
 */
async function post(path, body, schema, signal, token = "") {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  /** @type {unknown} */
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      throw new Error(data.error);
    }
    throw new Error("Service unavailable. Please try again.");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new Error("The service returned incomplete data. Please try again.");
  return parsed.data;
}

/** @param {string} query @param {AbortSignal} signal */
export async function searchCities(query, signal) {
  return (await post("/api/locations", { query }, citiesSchema, signal))
    .locations;
}

/** @param {HouseholdProfile} profile @param {AbortSignal} signal */
export async function loadGuidance(profile, signal) {
  const { latitude, longitude } = profile;
  const snapshot = await post(
    "/api/air",
    { latitude, longitude },
    snapshotSchema,
    signal,
  );
  if (snapshot.kind !== "modelled")
    throw new Error("Current modelled air data is unavailable.");
  return buildPlan(profile, snapshot);
}

/** @param {HouseholdProfile} profile @param {AbortSignal} signal @param {string} token */
export async function loadPersonalization(profile, signal, token) {
  const plan = await post("/api/analyze", profile, planSchema, signal, token);
  if (!plan.ai || plan.snapshot.kind !== "modelled")
    throw new Error("Live Gemini personalization is unavailable.");
  return plan;
}
