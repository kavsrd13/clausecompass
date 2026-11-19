import { searchSchema } from "../lib/contracts.js";
import { findCities } from "../lib/server/geocoding.js";
import { allowRequest } from "../lib/server/http.js";

/** @param {typeof fetch} fetcher @returns {import("../lib/server/http.js").ApiHandler} */
export function createLocationsHandler(fetcher = fetch) {
  return async (req, res) => {
    if (!allowRequest(req, res, "POST")) return;
    const search = searchSchema.safeParse(req.body);
    if (!search.success)
      return res
        .status(400)
        .json({ error: "Enter a city name of 2–80 characters." });
    try {
      const locations = await findCities(search.data.query, fetcher);
      return res.status(200).json({ locations });
    } catch {
      return res
        .status(502)
        .json({ error: "City search unavailable. Use a preset city." });
    }
  };
}
export default createLocationsHandler();
