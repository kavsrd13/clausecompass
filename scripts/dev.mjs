import "./build.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const routes = {
  "/api/air": "../api/air.js",
  "/api/locations": "../api/locations.js",
  "/api/analyze": "../api/analyze.js",
  "/api/models": "../api/models.js",
};
const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
};
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (routes[path]) {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 8192) {
          res.writeHead(413).end();
          return;
        }
      }
      const handler = (await import(routes[path])).default;
      req.body = body ? JSON.parse(body) : undefined;
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (value) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(value));
      };
      await handler(req, res);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const file = resolve(
      root,
      "." + decodeURIComponent(path === "/" ? "/index.html" : path),
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const content = await readFile(file);
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res
      .writeHead(400, { "Content-Type": "application/json" })
      .end(JSON.stringify({ error: "Request could not be served" }));
  }
});
server.listen(Number(process.env.PORT) || 5173, "127.0.0.1", () =>
  console.log("AirWise: http://127.0.0.1:" + (process.env.PORT || 5173)),
);
function stop() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
