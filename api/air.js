import { locationSchema } from "../lib/contracts.js";
import { fetchAir } from "../lib/server/air.js";
import { allowRequest } from "../lib/server/http.js";
/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
export default async function handler(req, res) {
  if (!allowRequest(req, res, "POST")) return;
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid location coordinates" });
  try {
    return res.status(200).json(await fetchAir(parsed.data));
  } catch {
    return res.status(502).json({
      error:
        "Fresh modelled air data is unavailable. Retry later or select the clearly labelled demo.",
    });
  }
}
