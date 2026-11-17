import { requestSchema, verify } from "../lib/contracts.js";
import { allowRequest, isAuthorized } from "../lib/server/http.js";
import { analyzeDocument, ProviderError } from "../lib/server/gemini.js";
/** @param {{config?:()=>import('../lib/server/gemini.js').ServerConfig,fetcher?:typeof fetch}} options */
export function createAnalyzeHandler(options = {}) {
  const getConfig =
    options.config ||
    (() => ({
      apiKey: process.env.GEMINI_API_KEY,
      accessToken: process.env.APP_ACCESS_TOKEN,
      model: process.env.GEMINI_MODEL,
    }));
  /** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
  return async function handler(req, res) {
    if (!allowRequest(req, res, "POST")) return;
    const config = getConfig();
    if (!config.apiKey)
      return res.status(503).json({
        error: "Live AI is not configured. Try the fictional example.",
      });
    if (!isAuthorized(req, config.accessToken))
      return res.status(401).json({
        error: "Enter the deployment access token in Live access settings.",
      });
    const validated = requestSchema.safeParse(req.body);
    if (!validated.success)
      return res.status(400).json({
        error:
          "Provide 30–80,000 characters of original text, a supported role, and a question of at most 1,000 characters.",
      });
    try {
      const result = await analyzeDocument(
        validated.data,
        config,
        options.fetcher || fetch,
      );
      const checked = verify(result, validated.data);
      return res.status(200).json({
        ...checked,
        incomplete: checked.findings.length !== result.findings.length,
      });
    } catch (error) {
      return res
        .status(error instanceof ProviderError ? error.status : 502)
        .json({
          error:
            error instanceof ProviderError
              ? error.message
              : "Analysis could not be validated or timed out. Your text remains available; retry or use a smaller section.",
        });
    }
  };
}
export default createAnalyzeHandler();
