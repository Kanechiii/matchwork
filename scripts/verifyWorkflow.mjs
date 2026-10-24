import assert from "node:assert/strict";
import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { orchestrateMatchInsight } from "../src/orchestration/matchWorkflow.ts";
import { extractWindowFeatures } from "../src/ai/features.ts";

const match = generateSyntheticMatch(demoMatch);
for (const second of [0, 15, 60, 180, 2700, 5400]) {
  const result = await orchestrateMatchInsight(match, second);
  assert.equal(result.clockSeconds, second);
  assert.deepEqual(result.trace.map(x => x.agent), ["intake", "analyst", "narrator", "auditor"]);
  assert.equal(result.trace.every(x => x.status === "ok"), true);
  assert.equal(result.recovered, false);
  assert.match(result.narrative, /synthetic-event summary/);
  const permitted = new Set(extractWindowFeatures(match, second).eventIds);
  assert.ok(result.evidenceEventIds.every(id => permitted.has(id)));
  assert.deepEqual(await orchestrateMatchInsight(match, second), result);
}
const good = await orchestrateMatchInsight(match, 180, async request => ({
  text: "Synthetic event summary, illustrative.",
  citedEventIds: [request.verifiedEventIds.at(-1)],
}));
assert.equal(good.recovered, false);
assert.match(good.narrative, /illustrative/);
const invalid = await orchestrateMatchInsight(match, 180, async () => ({
  text: "A claimed event occurred in the future",
  citedEventIds: ["evt-from-the-future"],
}));
assert.equal(invalid.recovered, true);
assert.match(invalid.narrative, /synthetic-event summary/);
assert.equal(invalid.trace[2].status, "recovered");
const thrown = await orchestrateMatchInsight(match, 180, async () => { throw new Error("model outage"); });
assert.equal(thrown.recovered, true);
assert.ok(thrown.evidenceEventIds.every(id => new Set(extractWindowFeatures(match, 180).eventIds).has(id)));
await assert.rejects(orchestrateMatchInsight(match, -1), /Clock outside/);
await assert.rejects(orchestrateMatchInsight(match, 5401), /Clock outside/);
console.log("WORKFLOW PROTOTYPE: PASS — specialist handoffs, temporal evidence, adapter success, invalid citation recovery, outage recovery, deterministic fallback");
