import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

test("a rejected mobile bundle leaves the last working planner available", async (t) => {
  // The isolated app shares the installed esbuild package through normal Node resolution.
  const project = await mkdtemp(resolve("node_modules", ".airwise-build-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const scripts = join(project, "scripts");
  await mkdir(scripts);
  const buildScript = join(scripts, "build.mjs");
  await copyFile("scripts/build.mjs", buildScript);
  await copyFile("index.html", join(project, "index.html"));
  await writeFile(join(project, "style.css"), "body { color: black }");
  const entry = join(project, "main.js");
  await writeFile(entry, 'import "./style.css"; document.title = "AirWise";');
  const { buildPlanner } = await import(pathToFileURL(buildScript).href);

  await promisify(execFile)(process.execPath, [buildScript], { cwd: project });
  const output = join(project, "dist");
  const html = await readFile(join(output, "index.html"), "utf8");
  assert.equal(html, await readFile("index.html", "utf8"));
  const assets = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map(
    (match) => join(output, match[1]),
  );
  assert.equal(assets.length, 2);
  const before = await Promise.all(assets.map((file) => readFile(file)));

  const largeText = createHash("shake256", { outputLength: 24000 })
    .update("repeatable oversized bundle fixture")
    .digest("base64");
  await writeFile(entry, `document.title = "${largeText}";`);
  await assert.rejects(buildPlanner(), /gzip budget/);
  assert.deepEqual(
    await Promise.all(assets.map((file) => readFile(file))),
    before,
  );
});
