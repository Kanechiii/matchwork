
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";

const first = generateSyntheticMatch(demoMatch);
const second = generateSyntheticMatch(demoMatch);
const different = generateSyntheticMatch(demoMatch, {
  seed: 2027,
});

const events = first.events;

assert.equal(events.length, 1200);
assert.equal(first.metadata.durationSeconds, 5400);

// Same seed must reproduce the same match.
assert.deepEqual(events, second.events);

// A different seed must produce different events.
assert.notDeepEqual(events, different.events);

const counts = {
  pass: 0,
  shot: 0,
  tackle: 0,
  pressure: 0,
  possession_change: 0,
};

const ids = new Set();
const teamById = new Map([
  [demoMatch.homeTeam.id, demoMatch.homeTeam],
  [demoMatch.awayTeam.id, demoMatch.awayTeam],
]);

let possession = demoMatch.homeTeam.id;
let previousTime = -1;
let goals = 0;

for (let i = 0; i < events.length; i++) {
  const event = events[i];
  const next = events[i + 1];

  // IDs, sequence numbers, and chronological ordering.
  assert.equal(event.sequence, i + 1);
  assert.ok(!ids.has(event.id));
  ids.add(event.id);

  assert.ok(event.elapsedSeconds >= previousTime);
  assert.ok(event.elapsedSeconds >= 0);
  assert.ok(event.elapsedSeconds < 5400);
  previousTime = event.elapsedSeconds;

  // All pitch coordinates must be valid.
  const coordinates = [event.x, event.y];

  if (event.type === "pass") {
    coordinates.push(event.endX, event.endY);
  }

  for (const value of coordinates) {
    assert.ok(Number.isInteger(value));
    assert.ok(value >= 0 && value <= 100);
  }

  // The acting player must belong to the acting team.
  const team = teamById.get(event.teamId);
  assert.ok(team);
  assert.ok(team.players.some(
    (player) => player.id === event.playerId,
  ));

  counts[event.type] += 1;

  if (event.type === "possession_change") {
    assert.equal(event.fromTeamId, possession);
    assert.notEqual(event.teamId, possession);
    possession = event.teamId;

  } else if (event.type === "pressure") {
    assert.notEqual(event.teamId, possession);

    const attackingTeam = teamById.get(possession);
    assert.ok(attackingTeam.players.some(
      (player) => player.id === event.targetPlayerId,
    ));

  } else if (event.type === "tackle") {
    assert.notEqual(event.teamId, possession);

    if (event.wonBall) {
      assert.equal(next?.type, "possession_change");
      assert.equal(next?.reason, "tackle");
    }

  } else if (event.type === "pass") {
    assert.equal(event.teamId, possession);

    assert.ok(team.players.some(
      (player) => player.id === event.receiverId,
    ));
    assert.notEqual(event.receiverId, event.playerId);

    if (!event.completed) {
      assert.equal(next?.type, "possession_change");
      assert.equal(next?.reason, "interception");
    }

  } else if (event.type === "shot") {
    assert.equal(event.teamId, possession);

    if (event.outcome === "goal") {
      goals += 1;
    }

    if (["goal", "saved", "off_target"].includes(
      event.outcome,
    )) {
      assert.equal(next?.type, "possession_change");
    }
  }
}

// All event types must be represented.
for (const count of Object.values(counts)) {
  assert.ok(count > 0);
}

// Invalid generator options must be rejected.
assert.throws(() =>
  generateSyntheticMatch(demoMatch, { eventCount: 899 }),
);

assert.throws(() =>
  generateSyntheticMatch(demoMatch, { eventCount: 1401 }),
);

assert.throws(() =>
  generateSyntheticMatch(demoMatch, { seed: -1 }),
);

const fingerprint = createHash("sha256")
  .update(JSON.stringify(events))
  .digest("hex")
  .slice(0, 16);

console.log("\nMATCHWORK GENERATOR VERIFICATION");
console.log("--------------------------------");
console.log("Duration: 90 minutes");
console.log("Total events:", events.length);
console.table(counts);
console.log("Goals:", goals);
console.log("Fingerprint:", fingerprint);
console.log("Determinism: PASSED");
console.log("Player and coordinate checks: PASSED");
console.log("Possession consistency: PASSED");
console.log("Invalid input checks: PASSED");
console.log("\nALL GENERATOR CHECKS PASSED");
