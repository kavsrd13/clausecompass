import { requestSchema } from "../lib/contracts.js";
import { buildPlan, eligibleActions } from "../lib/air.js";
import { fetchAir } from "../lib/server/air.js";
import { allowRequest, isAuthorized } from "../lib/server/http.js";
import { prioritize, ProviderError } from "../lib/server/gemini.js";
/** @param {{config?:()=>import('../lib/server/gemini.js').ServerConfig,fetcher?:typeof fetch,now?:()=>number}} options */
export function createAnalyzeHandler(options = {}) {
  const config =
    options.config ||
    (() => ({
      apiKey: process.env.GEMINI_API_KEY,
      accessToken: process.env.APP_ACCESS_TOKEN,
      model: process.env.GEMINI_MODEL,
    }));
  /** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
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
    if (!isAuthorized(req, settings.accessToken))
      return res
        .status(401)
        .json({ error: "Enter the app access token for AI personalization." });
    try {
      const snapshot = await fetchAir(
        parsed.data,
        options.fetcher || fetch,
        options.now?.() ?? Date.now(),
      );
      const ai = await prioritize(
        {
          profile: parsed.data,
          air: snapshot.current,
          eligible: eligibleActions(parsed.data, snapshot.current.aqi),
        },
        settings,
        options.fetcher || fetch,
      );
      if (
        ai.priorities.some(
          (id) =>
            !eligibleActions(parsed.data, snapshot.current.aqi).some(
              (a) => a.id === id,
            ),
        )
      )
        throw new ProviderError(
          "AI selected unsupported guidance. Use the guidance-only planner.",
        );
      return res
        .status(200)
        .json(buildPlan(parsed.data, snapshot, ai.priorities, true));
    } catch (e) {
      return res.status(e instanceof ProviderError ? e.status : 502).json({
        error:
          e instanceof ProviderError
            ? e.message
            : "Fresh air-quality data could not be validated. Retry later; no live readings were invented.",
      });
    }
  };
}
export default createAnalyzeHandler();
