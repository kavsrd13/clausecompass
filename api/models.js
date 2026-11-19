import { allowRequest, requireAccess } from "../lib/server/http.js";
import { z } from "zod";
const catalogue = z.object({
  nextPageToken: z.string().optional(),
  models: z.array(
    z.object({
      name: z.string(),
      supportedGenerationMethods: z.array(z.string()).optional(),
    }),
  ),
});

/** Follow Google's opaque page tokens under one deadline for the entire catalogue.
 * @param {string} apiKey @param {typeof fetch} fetcher */
async function listGenerationModels(apiKey, fetcher) {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models",
  );
  const signal = AbortSignal.timeout(15_000);
  /** @type {Set<string>} */
  const models = new Set();
  /** @type {Set<string>} */
  const seenTokens = new Set();
  while (true) {
    signal.throwIfAborted();
    const response = await fetcher(url, {
      headers: { "x-goog-api-key": apiKey },
      signal,
    });
    if (!response.ok)
      return {
        error: "Model discovery unavailable",
        providerStatus: response.status,
      };
    const page = catalogue.parse(await response.json());
    for (const model of page.models) {
      if (model.supportedGenerationMethods?.includes("generateContent"))
        models.add(model.name);
    }
    if (!page.nextPageToken)
      return { models: [...models], providerStatus: response.status };
    if (seenTokens.has(page.nextPageToken))
      throw new Error("Repeated model catalogue page");
    seenTokens.add(page.nextPageToken);
    url.searchParams.set("pageToken", page.nextPageToken);
  }
}
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
