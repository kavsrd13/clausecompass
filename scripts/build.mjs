import { build } from "esbuild";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { gzipSync } from "node:zlib";
const output = resolve("dist");
if (dirname(output) !== process.cwd())
  throw Error("Build directory must be within the project");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  entryPoints: ["main.js"],
  outdir: resolve(output, "assets"),
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  logLevel: "info",
});
// The planner runs on phones over mobile data. Check the delivered bundle after minification.
const maxGzipBytes = 16 * 1024;
const bundle = await readFile(resolve(output, "assets/main.js"));
const gzipBytes = gzipSync(bundle).byteLength;
if (gzipBytes > maxGzipBytes) {
  throw new Error(
    `Planner JavaScript exceeds the ${maxGzipBytes}-byte gzip budget (${gzipBytes} bytes)`,
  );
}
const html = await readFile("index.html", "utf8");
await writeFile(
  resolve(output, "index.html"),
  html
    .replace('src="/main.js"', 'src="/assets/main.js"')
    .replace(
      "</head>",
      '<link rel="stylesheet" href="/assets/main.css"></head>',
    ),
);
