
import assert from "node:assert/strict";

import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { calculateMatchStats } from "../src/engine/calculateStats.ts";

const homeId = demoMatch.homeTeam.id;
const awayId = demoMatch.awayTeam.id;

const homePlayer = demoMatch.homeTeam.players[10].id;
const homeOther = demoMatch.homeTeam.players[7].id;
const awayPlayer = demoMatch.awayTeam.players[10].id;
const awayOther = demoMatch.awayTeam.players[7].id;

function base(sequence, elapsedSeconds, teamId, playerId) {
  return {
    id: `fixture-${sequence}`,
    sequence,
    elapsedSeconds,
    teamId,
    playerId,
    x: 50,
    y: 50,
  };
}

// Controlled fixture with exactly known results.
const fixture = {
  metadata: demoMatch,
  events: [
    {
      ...base(1, 0, homeId, homePlayer),
      type: "pass",
      receiverId: homeOther,
      endX: 55,
      endY: 50,
      completed: true,
    },
    {
      ...base(2, 60, homeId, homeOther),
      type: "shot",
      outcome: "goal",
    },
    {
      ...base(3, 60, awayId, awayPlayer),
      type: "possession_change",
      fromTeamId: homeId,
      reason: "restart",
    },
    {
      ...base(4, 90, homeId, homePlayer),
      type: "pressure",
      intensity: 2,
      targetPlayerId: awayPlayer,
    },
    {
      ...base(5, 120, homeId, homePlayer),
      type: "tackle",
      wonBall: true,
    },
    {
      ...base(6, 120, homeId, homeOther),
      type: "possession_change",
      fromTeamId: awayId,
      reason: "tackle",
    },
    {
      ...base(7, 180, homeId, homeOther),
      type: "pass",
      receiverId: homePlayer,
      endX: 58,
      endY: 48,
      completed: false,
    },
    {
      ...base(8, 180, awayId, awayPlayer),
      type: "possession_change",
      fromTeamId: homeId,
      reason: "interception",
    },
    {
      ...base(9, 240, awayId, awayPlayer),
      type: "pass",
      receiverId: awayOther,
      endX: 44,
      endY: 50,
      completed: true,
    },
  ],
};

// Analyze only the first five minutes.
const at300 = calculateMatchStats(fixture, 300);

// Score and shooting.
assert.equal(at300.home.goals, 1);
assert.equal(at300.away.goals, 0);
assert.equal(at300.home.shots, 1);
assert.equal(at300.home.shotsOnTarget, 1);

// Passing.
assert.equal(at300.home.passesAttempted, 2);
assert.equal(at300.home.passesCompleted, 1);
assert.equal(at300.home.passCompletionPct, 50);

assert.equal(at300.away.passesAttempted, 1);
assert.equal(at300.away.passesCompleted, 1);
assert.equal(at300.away.passCompletionPct, 100);

// Defensive actions.
assert.equal(at300.home.tacklesAttempted, 1);
assert.equal(at300.home.tacklesWon, 1);
assert.equal(at300.home.pressuresApplied, 1);
assert.equal(at300.away.tacklesAttempted, 0);

// Time-based possession.
assert.equal(at300.home.possessionSeconds, 120);
assert.equal(at300.away.possessionSeconds, 180);
assert.equal(at300.home.possessionPct, 40);
assert.equal(at300.away.possessionPct, 60);

assert.equal(at300.processedEvents, 9);

// Test an earlier replay snapshot.
const at90 = calculateMatchStats(fixture, 90);

assert.equal(at90.processedEvents, 4);
assert.equal(at90.home.possessionSeconds, 60);
assert.equal(at90.away.possessionSeconds, 30);
assert.equal(at90.home.pressuresApplied, 1);

// Invalid snapshot times must be rejected.
assert.throws(
  () => calculateMatchStats(fixture, -1),
);

assert.throws(
  () => calculateMatchStats(fixture, 5401),
);

// Incorrect possession history must be rejected.
const invalidFixture = {
  ...fixture,
  events: fixture.events.map((event, index) =>
    index === 2
      ? { ...event, fromTeamId: awayId }
      : event,
  ),
};

assert.throws(
  () => calculateMatchStats(invalidFixture, 300),
  /Invalid possession transition/,
);

// Now analyze the full generated 90-minute match.
const generated = generateSyntheticMatch(demoMatch);
const full = calculateMatchStats(generated);

assert.equal(full.processedEvents, 1200);
assert.equal(full.elapsedSeconds, 5400);

// Total possession must equal the match duration.
assert.equal(
  full.home.possessionSeconds +
    full.away.possessionSeconds,
  5400,
);

// Statistics must reconcile with the underlying events.
const count = (type) =>
  generated.events.filter((event) => event.type === type)
    .length;

assert.equal(
  full.home.shots + full.away.shots,
  count("shot"),
);

assert.equal(
  full.home.passesAttempted +
    full.away.passesAttempted,
  count("pass"),
);

assert.equal(
  full.home.tacklesAttempted +
    full.away.tacklesAttempted,
  count("tackle"),
);

assert.equal(
  full.home.pressuresApplied +
    full.away.pressuresApplied,
  count("pressure"),
);

const generatedGoals = generated.events.filter(
  (event) =>
    event.type === "shot" &&
    event.outcome === "goal",
).length;

assert.equal(
  full.home.goals + full.away.goals,
  generatedGoals,
);

// Replay snapshots must retain the correct time total.
for (const second of [0, 900, 1800, 2700, 3600, 5400]) {
  const snapshot = calculateMatchStats(generated, second);

  assert.equal(
    snapshot.home.possessionSeconds +
      snapshot.away.possessionSeconds,
    second,
  );

  assert.ok(snapshot.processedEvents <= 1200);
}

// Repeatability.
assert.deepEqual(
  calculateMatchStats(generated),
  calculateMatchStats(generated),
);

console.log("\nMATCHWORK STATISTICS VERIFICATION");
console.log("--------------------------------");
console.log("Synthetic match events:", generated.events.length);
console.log("Processed events:", full.processedEvents);
console.log("Home team:", demoMatch.homeTeam.name);
console.log("Away team:", demoMatch.awayTeam.name);
console.log("Score:", full.home.goals, "-", full.away.goals);

console.table([
  {
    team: demoMatch.homeTeam.abbreviation,
    ...full.home,
  },
  {
    team: demoMatch.awayTeam.abbreviation,
    ...full.away,
  },
]);

console.log("Controlled fixture: PASSED");
console.log("Possession time accounting: PASSED");
console.log("Event/statistics reconciliation: PASSED");
console.log("Replay snapshots: PASSED");
console.log("Invalid input checks: PASSED");
console.log("\nALL MATCH STATISTICS CHECKS PASSED");
