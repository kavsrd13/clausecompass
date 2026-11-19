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
export async function listGenerationModels(apiKey, fetcher) {
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
      redirect: "error",
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
