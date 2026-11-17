import { createHash, timingSafeEqual } from "node:crypto";
const hash = (s) => createHash("sha256").update(s).digest();
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (
    !process.env.APP_ACCESS_TOKEN ||
    !timingSafeEqual(
      hash(String(req.headers.authorization || "")),
      hash(`Bearer ${process.env.APP_ACCESS_TOKEN}`),
    )
  )
    return res.status(401).json({ error: "Access required" });
  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(15000),
      },
    );
    const d = await r.json();
    return res.status(r.status).json({
      models: d.models
        ?.filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => m.name),
      providerStatus: r.status,
    });
  } catch {
    return res.status(502).json({ error: "Provider unavailable" });
  }
}
