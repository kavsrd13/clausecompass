import { createHash, timingSafeEqual } from "node:crypto";
/** @typedef {{method?:string, headers:Record<string,string|string[]|undefined>, body?:unknown}} ApiRequest */
/** @typedef {{setHeader(name:string,value:string):void,status(code:number):ApiResponse,json(body:unknown):unknown}} ApiResponse */
/** @param {ApiRequest} req @param {ApiResponse} res @param {string} method */
export function allowRequest(req, res, method) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== method) {
    res.setHeader("Allow", method);
    res.status(405).json({ error: `${method} required` });
    return false;
  }
  try {
    const origin = req.headers.origin;
    if (
      origin &&
      (typeof origin !== "string" || new URL(origin).host !== req.headers.host)
    ) {
      res.status(403).json({ error: "Origin rejected" });
      return false;
    }
  } catch {
    res.status(403).json({ error: "Invalid origin" });
    return false;
  }
  return true;
}
/** @param {ApiRequest} req @param {string|undefined} token */
export function isAuthorized(req, token) {
  if (!token) return false;
  const digest = (/** @type {string} */ value) =>
    createHash("sha256").update(value).digest();
  return timingSafeEqual(
    digest(String(req.headers.authorization || "")),
    digest(`Bearer ${token}`),
  );
}
