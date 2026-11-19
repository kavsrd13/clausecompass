import { allowRequest, isAuthorized } from "../lib/server/http.js";
import { z } from "zod";
const catalogue = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      supportedGenerationMethods: z.array(z.string()).optional(),
    }),
  ),
});
/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
export default async function handler(req, res) {
  if (!allowRequest(req, res, "GET")) return;
  if (!isAuthorized(req, process.env.APP_ACCESS_TOKEN))
    return res.status(401).json({ error: "Access required" });
  if (!process.env.GEMINI_API_KEY)
    return res.status(503).json({ error: "Live AI is not configured." });
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      return res.status(502).json({
        error: "Model discovery unavailable",
        providerStatus: response.status,
      });
    const data = catalogue.parse(await response.json());
    return res.status(200).json({
      models: data.models
        .filter((model) =>
          model.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((model) => model.name),
      providerStatus: response.status,
    });
  } catch {
    return res.status(502).json({ error: "Provider unavailable" });
  }
}
