import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const out = resolve("dist");
const html = readFileSync(join(out, "index.html"), "utf8");
const base = "/matchwork/";
const entries = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
assert.ok(html.includes("<title>Matchwork"), "Missing application title");
assert.ok(entries.some(x => x.startsWith(base + "assets/")), "Vite assets are not under repository base path");
for (const path of entries) {
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("#")) continue;
  assert.ok(path.startsWith(base), `Root-relative or unexpected asset URL: ${path}`);
  const disk = resolve(out, path.slice(base.length));
  assert.ok(statSync(disk).isFile(), `Asset missing from dist: ${disk}`);
}
assert.ok(readdirSync(out).includes("assets"));
console.log("PAGES BUILD: PASS — HTML assets have /matchwork/ prefix and exist on disk");
