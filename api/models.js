import { allowRequest, requireAccess } from "../lib/server/http.js";
import { listGenerationModels } from "../lib/server/model-catalogue.js";

/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res
 * @param {NodeJS.ProcessEnv} env @param {typeof fetch} fetcher */
export async function handleModels(req, res, env, fetcher) {
  if (!allowRequest(req, res, "GET")) return;
  if (!requireAccess(req, res, env.APP_ACCESS_TOKEN, "Access required")) return;
  if (!env.GEMINI_API_KEY)
    return res.status(503).json({ error: "Live AI is not configured." });
  try {
    const catalogue = await listGenerationModels(env.GEMINI_API_KEY, fetcher);
    return res.status("error" in catalogue ? 502 : 200).json(catalogue);
  } catch {
    return res.status(502).json({ error: "Provider unavailable" });
  }
}
/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
export default function handler(req, res) {
  return handleModels(req, res, process.env, fetch);
}
