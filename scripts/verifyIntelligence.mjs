import assert from "node:assert/strict";
import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { extractWindowFeatures, FEATURE_NAMES } from "../src/ai/features.ts";
import { buildMatchRecap } from "../src/ai/explanations.ts";
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
console.log("MATCHWORK PHASE 3 INTELLIGENCE: PASS — leakage, normalization, evidence, recap");
