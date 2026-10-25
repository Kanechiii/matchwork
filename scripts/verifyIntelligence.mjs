import assert from "node:assert/strict";
import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { extractWindowFeatures, FEATURE_NAMES } from "../src/ai/features.ts";
import { buildMatchRecap, explainMatchState } from "../src/ai/explanations.ts";
import { createPredictionRequestGate } from "../src/ai/inference.ts";
const match = generateSyntheticMatch(demoMatch);
assert.equal(FEATURE_NAMES.length, 7);
let prev = null;
for (const second of [0, 20, 60, 300, 1800, 3600, 5400]) {
  const x = extractWindowFeatures(match, second);
  assert.equal(x.values.length, 7);
  assert.ok(x.values.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  assert.ok(x.eventIds.every(id => match.events.some(e => e.id === id && e.elapsedSeconds <= second)));
  assert.ok(x.startSeconds <= second);
  if (prev) assert.notDeepEqual(x.eventIds, prev.eventIds);
  prev = x;
  assert.ok(buildMatchRecap(match, second).includes("shots"));
}
assert.throws(() => extractWindowFeatures(match, -1));
assert.throws(() => extractWindowFeatures(match, 5401));
const at60 = extractWindowFeatures(match, 60);
const futureChanged = structuredClone(match);
futureChanged.events = futureChanged.events.filter(e => e.elapsedSeconds <= 60);
assert.deepEqual(extractWindowFeatures(futureChanged, 60), at60);
// Chronological boundaries, including each side of a 15-second inference tick.
for (const second of [0, 1, 14, 15, 16, 2699, 2700, 2701, 5399, 5400]) {
  const features = extractWindowFeatures(match, second);
  const observed = match.events.filter(e => e.elapsedSeconds >= features.startSeconds && e.elapsedSeconds <= second);
  assert.deepEqual(features.eventIds, observed.map(e => e.id));
  assert.equal(features.eventCount, observed.length);
  assert.equal(features.passesAttempted, observed.filter(e => e.type === "pass").length);
  assert.equal(features.passesCompleted, observed.filter(e => e.type === "pass" && e.completed).length);
  assert.equal(features.pressures, observed.filter(e => e.type === "pressure").length);
  assert.equal(features.shots, observed.filter(e => e.type === "shot").length);
  assert.equal(features.turnovers, observed.filter(e => e.type === "possession_change").length);
  const insight = explainMatchState(features, null, "analyst", "all", match);
  assert.ok(insight.evidenceEventIds.every(id => features.eventIds.includes(id)));
}
const at15 = extractWindowFeatures(match, 15);
assert.deepEqual(extractWindowFeatures({...match, events: [...match.events].reverse()}, 15), at15);
assert.deepEqual(extractWindowFeatures({...match, events: [...match.events, ...match.events]}, 15), at15);
const gate = createPredictionRequestGate();
const first = gate.next();
const second = gate.next();
assert.equal(gate.isCurrent(first), false);
assert.equal(gate.isCurrent(second), true);
gate.invalidate();
assert.equal(gate.isCurrent(second), false);
const stalePrediction = { label: "CONTROL", probabilities: [1, 0, 0], confidence: 1, backend: "onnxruntime-web", asOfSeconds: 15 };
assert.equal(explainMatchState(extractWindowFeatures(match, 16), stalePrediction, "analyst", "all", match).modelBacked, false);
assert.equal(explainMatchState(at15, stalePrediction, "analyst", "all", match).modelBacked, true);
assert.throws(() => buildMatchRecap(match, 5401));
console.log("MATCHWORK INTELLIGENCE: PASS — boundaries, counts, evidence, seeking, as-of timestamps, recap");
