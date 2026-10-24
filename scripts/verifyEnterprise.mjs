import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { performance } from "node:perf_hooks";
import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { calculateMatchStats } from "../src/engine/calculateStats.ts";
import { createReplayState, seekReplay, getReplayFrame } from "../src/engine/replay.ts";
import { extractWindowFeatures } from "../src/ai/features.ts";
import { buildMatchRecap } from "../src/ai/explanations.ts";

const ok = (condition, message) => assert.ok(condition, message);
const match = generateSyntheticMatch(demoMatch);
const fingerprint = m => createHash("sha256").update(JSON.stringify(m.events)).digest("hex");
assert.equal(fingerprint(match), fingerprint(generateSyntheticMatch(demoMatch)), "match replay must be deterministic");
const checkpoints = [0, 1, 14, 15, 16, 179, 180, 181, 899, 2700, 3599, 5399, 5400];
for (const clock of checkpoints) {
  const snapshot = calculateMatchStats(match, clock);
  const frame = getReplayFrame(match, seekReplay(createReplayState(match), match, clock));
  assert.deepEqual(frame.stats, snapshot, `replay mismatch at ${clock}`);
  const expected = match.events.filter(e => e.elapsedSeconds <= clock);
  assert.equal(snapshot.processedEvents, expected.length, `future events leaked at ${clock}`);
  const win = extractWindowFeatures(match, clock);
  const visibleIds = new Set(expected.map(e => e.id));
  ok(win.eventIds.every(id => visibleIds.has(id)), `feature event leakage at ${clock}`);
  ok(win.values.every(v => Number.isFinite(v) && v >= 0 && v <= 1), "invalid model features");
  const recap = buildMatchRecap(match, clock);
  ok(recap.includes(`Through ${String(Math.floor(clock / 60)).padStart(2,"0")}:${String(clock % 60).padStart(2,"0")}`), "recap clock mismatch");
  const future = structuredClone(match);
  future.events = future.events.filter(e => e.elapsedSeconds <= clock);
  assert.deepEqual(extractWindowFeatures(future, clock), win, "features depended on future events");
  assert.equal(buildMatchRecap(future, clock), recap, "recap depended on future events");
}
for (const count of [900, 1200, 1400]) {
  for (const seed of [1, 42, 2026, 4294967295]) {
    const sample = generateSyntheticMatch(demoMatch, { seed, eventCount: count });
    assert.equal(sample.events.length, count);
    assert.equal(fingerprint(sample), fingerprint(generateSyntheticMatch(demoMatch, { seed, eventCount: count })));
    const stats = calculateMatchStats(sample);
    assert.equal(stats.processedEvents, count);
    assert.equal(stats.home.possessionSeconds + stats.away.possessionSeconds, 5400);
  }
}
const corrupted = structuredClone(match);
corrupted.events[1].id = corrupted.events[0].id;
assert.throws(() => calculateMatchStats(corrupted), /Invalid event order, ID, or time/);
assert.throws(() => calculateMatchStats(match, -1));
assert.throws(() => calculateMatchStats(match, 5401));
assert.throws(() => generateSyntheticMatch(demoMatch, { eventCount: 2000000 }));
assert.throws(() => generateSyntheticMatch(demoMatch, { seed: -1 }));

// Verify what is actually shipped to judges, not merely what exists in source.
const root = resolve("dist");
const html = readFileSync(join(root, "index.html"), "utf8");
ok(html.includes("<title>Matchwork"), "release title absent");
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
const seen = new Set();
for (const path of assets) {
  if (path.startsWith("data:") || path.startsWith("https://") || path.startsWith("#")) continue;
  ok(path.startsWith("/matchwork/"), `incorrect GitHub Pages asset path: ${path}`);
  ok(!seen.has(path), "duplicate linked release asset");
  seen.add(path);
  const file = resolve(root, path.substring("/matchwork/".length));
  ok(file.startsWith(root + "/"), "asset path escaped build root");
  ok(statSync(file).isFile(), "linked asset missing");
}
ok(readdirSync(root).includes("assets"), "bundled release assets missing");
const allFiles = readdirSync(join(root, "assets")).filter(p => /\.(?:js|css)$/.test(p));
ok(allFiles.some(p => p.endsWith(".js")), "no bundled JS");
for (const name of allFiles) {
  const txt = readFileSync(join(root, "assets", name), "utf8");
  ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(txt), "private key marker in release");
  ok(!/(?:sk-proj-|ghp_)[A-Za-z0-9_-]{15,}/.test(txt), "common API credential format in release");
}
const start = performance.now();
let snapshotCount = 0;
for (const clock of [0, 60, 600, 1800, 2700, 3600, 4500, 5400]) {
  for (let i = 0; i < 100; i++) {
    calculateMatchStats(match, clock);
    snapshotCount++;
  }
}
const durationMs = performance.now() - start;
ok(Number.isFinite(durationMs) && durationMs > 0, "invalid benchmark duration");
console.log("ENTERPRISE GATE: PASS — replay parity, 13 as-of checks, 12 deterministic scenarios, malformed input rejection, Pages release inspection");
console.log(JSON.stringify({ snapshotCount, totalSnapshotDurationMs: Number(durationMs.toFixed(2)), syntheticEvents: match.events.length, fixtureSha256: fingerprint(match), result: "pass" }));
