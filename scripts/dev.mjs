import "./build.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import air from "../api/air.js";
import analyze from "../api/analyze.js";
import locations from "../api/locations.js";
import models from "../api/models.js";
/** @import {IncomingMessage, ServerResponse} from "node:http" */
/** @import {ApiHandler, ApiResponse} from "../lib/server/http.js" */

/** @type {Map<string, ApiHandler>} */
const routes = new Map([
  ["/api/air", air],
  ["/api/locations", locations],
  ["/api/analyze", analyze],
  ["/api/models", models],
]);
const root = resolve("dist");
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript"],
  [".css", "text/css"],
]);

class RequestError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** @param {IncomingMessage} request @returns {Promise<unknown>} */
async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 8192) throw new RequestError(413, "Request body is too large");
    chunks.push(chunk);
  }
  if (!bytes) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Expected a JSON request body");
  }
}

/** @param {ServerResponse} response @returns {ApiResponse} */
function apiResponse(response) {
  return {
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(value) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(value));
    },
  };
}

/** @param {string} pathname @param {IncomingMessage} request @param {ServerResponse} response */
async function serveFile(pathname, request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    throw new RequestError(405, "GET or HEAD required");
  }
  const file = resolve(
    root,
    "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(root + sep))
    throw new RequestError(403, "File is outside the build");
  try {
    const content = await readFile(file);
    response.setHeader(
      "Content-Type",
      types.get(extname(file)) ?? "application/octet-stream",
    );
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ["ENOENT", "ENOTDIR", "EISDIR"].includes(String(error.code))
    )
      throw new RequestError(404, "File not found");
    throw error;
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const handler = routes.get(pathname);
    if (handler) {
      const body = await readBody(request);
      await handler(
        { method: request.method, headers: request.headers, body },
        apiResponse(response),
      );
    } else {
      await serveFile(pathname, request, response);
    }
  } catch (error) {
    let status = 500;
    let message = "Request could not be served";
    if (error instanceof RequestError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof URIError) {
      status = 400;
      message = "Invalid request path";
    }
    response
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify({ error: message }));
  }
});
const port = Number(process.env.PORT) || 5173;
server.listen(port, "127.0.0.1", () =>
  console.log(`AirWise: http://127.0.0.1:${port}`),
);
function stop() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
