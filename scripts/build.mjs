import { build } from "esbuild";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const project = resolve(import.meta.dirname, "..");
const output = join(project, "dist");
const assets = join(output, "assets");
const maxGzipBytes = 16 * 1024;

export async function buildPlanner() {
  const { outputFiles } = await build({
    absWorkingDir: project,
    entryPoints: ["main.js"],
    outdir: assets,
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2022",
    write: false,
  });
  const script = outputFiles.find(
    (file) => file.path === join(assets, "main.js"),
  );
  if (!script) throw new Error("Planner JavaScript missing from the build.");
  const gzipBytes = gzipSync(script.contents).byteLength;
  if (gzipBytes > maxGzipBytes) {
    throw new Error(
      `Planner JavaScript exceeds the ${maxGzipBytes}-byte gzip budget (${gzipBytes} bytes)`,
    );
  }

  // A compilation or budget failure must leave the last usable build in place.
  await rm(output, { recursive: true, force: true });
  await mkdir(assets, { recursive: true });
  await Promise.all(
    outputFiles.map((file) => writeFile(file.path, file.contents)),
  );
  await copyFile(join(project, "index.html"), join(output, "index.html"));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await buildPlanner();
}
