import { createHash, timingSafeEqual } from "node:crypto";
/**
 * Request and response members shared by Vercel and the local development server.
 * Each endpoint validates its request body before passing data into the planner.
 * @typedef {object} ApiRequest
 * @property {string} [method]
 * @property {Record<string, string | string[] | undefined>} headers
 * @property {unknown} [body]
 */
/**
 * @typedef {object} ApiResponse
 * @property {(name: string, value: string) => void} setHeader
 * @property {(code: number) => ApiResponse} status
 * @property {(body: unknown) => unknown} json
 */
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
