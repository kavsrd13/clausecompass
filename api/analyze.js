import { requestSchema } from "../lib/contracts.js";
import { applyRanking, buildPlan } from "../lib/air.js";
import { fetchAir } from "../lib/server/air.js";
import { allowRequest, requireAccess } from "../lib/server/http.js";
import { prioritize, ProviderError } from "../lib/server/gemini.js";

function readConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY,
    accessToken: process.env.APP_ACCESS_TOKEN,
    model: process.env.GEMINI_MODEL,
  };
}

/** @param {{ config?: () => import("../lib/server/gemini.js").ServerConfig, fetcher?: typeof fetch, now?: () => number }} options
 * @returns {import("../lib/server/http.js").ApiHandler} */
export function createAnalyzeHandler({
  config = readConfig,
  fetcher = fetch,
  now = Date.now,
} = {}) {
  return async (req, res) => {
    if (!allowRequest(req, res, "POST")) return;
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        error:
          "Check the city, coordinates, household choices and journey limits.",
      });
    const settings = config();
    if (!settings.apiKey)
      return res.status(503).json({
        error: "Gemini is not configured. Use the guidance-only planner.",
      });
    if (
      !requireAccess(
        req,
        res,
        settings.accessToken,
        "Enter the app access token for AI personalization.",
      )
    )
      return;
    try {
      const snapshot = await fetchAir(parsed.data, fetcher, now());
      const plan = buildPlan(parsed.data, snapshot);
      const priorities = await prioritize(
        plan,
        { apiKey: settings.apiKey, model: settings.model },
        fetcher,
      );
      return res.status(200).json(applyRanking(plan, priorities));
    } catch (error) {
      if (error instanceof ProviderError)
        return res.status(error.status).json({ error: error.message });
      return res.status(502).json({
        error:
          "Fresh air-quality data could not be validated. Please retry later.",
      });
    }
  };
}
export default createAnalyzeHandler();
