import { allowRequest } from "../lib/server/http.js";
/** @param {import('../lib/server/http.js').ApiRequest} req @param {import('../lib/server/http.js').ApiResponse} res */
export default async function handler(req, res) {
  if (!allowRequest(req, res, "POST")) return;
  const query =
    typeof req.body === "object" && req.body !== null && "query" in req.body
      ? req.body.query
      : null;
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 80)
    return res
      .status(400)
      .json({ error: "Enter a city name of 2–80 characters." });
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query.trim(),
      count: "5",
      language: "en",
      format: "json",
    }).toString();
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw Error();
    const data = await r.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return res.status(200).json({
      locations: results
        .map(
          (
            /** @type {{name:string,country:string,admin1?:string,latitude:number,longitude:number}} */ c,
          ) => ({
            name: [c.name, c.admin1, c.country].filter(Boolean).join(", "),
            latitude: c.latitude,
            longitude: c.longitude,
          }),
        )
        .filter(
          (/** @type {{latitude:number,longitude:number}} */ c) =>
            Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
        ),
    });
  } catch {
    return res
      .status(502)
      .json({ error: "City search unavailable. Use a preset city." });
  }
}
