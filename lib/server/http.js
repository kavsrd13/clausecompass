import { createHash, timingSafeEqual } from "node:crypto";
/** @typedef {{method?:string, headers:Record<string,string|string[]|undefined>, body?:unknown}} ApiRequest */
/** @typedef {{setHeader(name:string,value:string):void,status(code:number):ApiResponse,json(body:unknown):unknown}} ApiResponse */
/** @typedef {(req: ApiRequest, res: ApiResponse) => Promise<unknown>} ApiHandler */
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
/** @param {ApiRequest} req @param {ApiResponse} res @param {string|undefined} token @param {string} message */
export function requireAccess(req, res, token, message) {
  const header = req.headers.authorization;
  const supplied =
    typeof header === "string" && /^Bearer +(.+)$/i.exec(header)?.[1];
  const digest = (/** @type {string} */ value) =>
    createHash("sha256").update(value).digest();
  if (token && supplied && timingSafeEqual(digest(supplied), digest(token)))
    return true;
  res.setHeader("WWW-Authenticate", 'Bearer realm="AirWise"');
  res.status(401).json({ error: message });
  return false;
}
