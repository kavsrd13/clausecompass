import { build } from "esbuild";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
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
