import { locationSchema } from "../lib/contracts.js";
import { fetchAir } from "../lib/server/air.js";
import { allowRequest } from "../lib/server/http.js";

export const MAX_SHARED_FORECASTS = 32;
/** @type {Map<string, ReturnType<typeof fetchAir>>} */
const pendingForecasts = new Map();

/** Share an outstanding public lookup only within this server instance.
 * @param {Parameters<typeof fetchAir>[0]} coordinates */
function loadForecast(coordinates) {
  const key = `${coordinates.latitude},${coordinates.longitude}`;
  const pending = pendingForecasts.get(key);
  if (pending) return pending;

  const lookup = fetchAir(coordinates);
  if (pendingForecasts.size >= MAX_SHARED_FORECASTS) return lookup;

  const shared = lookup.finally(() => pendingForecasts.delete(key));
  pendingForecasts.set(key, shared);
  return shared;
}

/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
export default async function handler(req, res) {
  if (!allowRequest(req, res, "POST")) return;
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid location coordinates" });
  try {
    return res.status(200).json(await loadForecast(parsed.data));
  } catch {
    return res.status(502).json({
      error:
        "Fresh modelled air data is unavailable. Retry later or select the clearly labelled demo.",
    });
  }
}
