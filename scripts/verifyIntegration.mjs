
import assert from "node:assert/strict";

import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";
import { calculateMatchStats } from "../src/engine/calculateStats.ts";
import {
  advanceReplay,
  createReplayState,
  getReplayFrame,
  pauseReplay,
  playReplay,
  restartReplay,
  seekReplay,
  setReplaySpeed,
} from "../src/engine/replay.ts";

const seeds = [0, 1, 2026, 4294967295];
const eventCounts = [900, 1200, 1400];

let scenariosPassed = 0;
let eventsAudited = 0;

const teams = [
  demoMatch.homeTeam,
  demoMatch.awayTeam,
];

const playerTeam = new Map(
  teams.flatMap((team) =>
    team.players.map((player) => [player.id, team.id]),
  ),
);

function validateEvents(match) {
  const { events, metadata } = match;
  const uniqueIds = new Set();
  let possession = metadata.homeTeam.id;
  let previousTime = -1;

  assert.equal(playerTeam.size, 22);

  for (const [index, event] of events.entries()) {
    assert.equal(event.sequence, index + 1);
    assert.equal(typeof event.id, "string");
    assert.ok(event.id.length > 0);
    assert.ok(!uniqueIds.has(event.id));
    uniqueIds.add(event.id);

    assert.ok(Number.isSafeInteger(event.elapsedSeconds));
    assert.ok(event.elapsedSeconds >= previousTime);
    assert.ok(event.elapsedSeconds >= 0);
    assert.ok(
      event.elapsedSeconds < metadata.durationSeconds,
    );
    previousTime = event.elapsedSeconds;

    assert.equal(playerTeam.get(event.playerId), event.teamId);

    const coordinates = [event.x, event.y];

    if (event.type === "pass") {
      coordinates.push(event.endX, event.endY);
      assert.equal(
        playerTeam.get(event.receiverId),
        event.teamId,
      );
      assert.notEqual(event.receiverId, event.playerId);
      assert.equal(event.teamId, possession);

      if (!event.completed) {
        assert.equal(
          events[index + 1]?.type,
          "possession_change",
        );
        assert.equal(
          events[index + 1]?.reason,
          "interception",
        );
      }
    }

    if (event.type === "shot") {
      assert.equal(event.teamId, possession);
      assert.ok(
        ["goal", "saved", "blocked", "off_target"].includes(
          event.outcome,
        ),
      );

      if (event.outcome === "goal" ||
          event.outcome === "off_target") {
        assert.equal(
          events[index + 1]?.type,
          "possession_change",
        );
        assert.equal(
          events[index + 1]?.reason,
          "restart",
        );
      }

      if (event.outcome === "saved") {
        assert.equal(
          events[index + 1]?.type,
          "possession_change",
        );
        assert.equal(
          events[index + 1]?.reason,
          "loose_ball",
        );
      }
    }

    if (event.type === "tackle") {
      assert.notEqual(event.teamId, possession);

      if (event.wonBall) {
        assert.equal(
          events[index + 1]?.type,
          "possession_change",
        );
        assert.equal(
          events[index + 1]?.reason,
          "tackle",
        );
      }
    }

    if (event.type === "pressure") {
      assert.notEqual(event.teamId, possession);
      assert.equal(
        playerTeam.get(event.targetPlayerId),
        possession,
      );
      assert.ok([1, 2, 3].includes(event.intensity));
    }

    if (event.type === "possession_change") {
      const previous = events[index - 1];

      assert.ok(previous);
      assert.equal(event.fromTeamId, possession);
      assert.notEqual(event.teamId, possession);

      // Every turnover must have a recognizable cause.
      const validCause =
        (previous.type === "pass" &&
          !previous.completed &&
          event.reason === "interception") ||
        (previous.type === "tackle" &&
          previous.wonBall &&
          event.reason === "tackle") ||
        (previous.type === "shot" &&
          ["goal", "off_target"].includes(
            previous.outcome,
          ) &&
          event.reason === "restart") ||
        (previous.type === "shot" &&
          ["saved", "blocked"].includes(
            previous.outcome,
          ) &&
          event.reason === "loose_ball");

      assert.ok(validCause, "Unexplained possession change");

      possession = event.teamId;
    }

    for (const coordinate of coordinates) {
      assert.ok(Number.isInteger(coordinate));
      assert.ok(coordinate >= 0 && coordinate <= 100);
    }
  }

  assert.equal(uniqueIds.size, events.length);
}

function countTeamEvents(match, teamId, predicate) {
  return match.events.filter(
    (event) =>
      event.teamId === teamId && predicate(event),
  ).length;
}

function validateStatistics(match) {
  const result = calculateMatchStats(match);
  const duration = match.metadata.durationSeconds;

  assert.equal(result.processedEvents, match.events.length);
  assert.equal(result.elapsedSeconds, duration);

  assert.equal(
    result.home.possessionSeconds +
      result.away.possessionSeconds,
    duration,
  );

  for (const stats of [result.home, result.away]) {
    const id = stats.teamId;

    const count = (predicate) =>
      countTeamEvents(match, id, predicate);

    assert.equal(
      stats.goals,
      count((e) => e.type === "shot" &&
        e.outcome === "goal"),
    );
    assert.equal(
      stats.shots,
      count((e) => e.type === "shot"),
    );
    assert.equal(
      stats.shotsOnTarget,
      count((e) => e.type === "shot" &&
        ["goal", "saved"].includes(e.outcome)),
    );
    assert.equal(
      stats.passesAttempted,
      count((e) => e.type === "pass"),
    );
    assert.equal(
      stats.passesCompleted,
      count((e) => e.type === "pass" && e.completed),
    );
    assert.equal(
      stats.tacklesAttempted,
      count((e) => e.type === "tackle"),
    );
    assert.equal(
      stats.tacklesWon,
      count((e) => e.type === "tackle" && e.wonBall),
    );
    assert.equal(
      stats.pressuresApplied,
      count((e) => e.type === "pressure"),
    );

    assert.ok(stats.passesCompleted <= stats.passesAttempted);
    assert.ok(stats.shotsOnTarget <= stats.shots);
    assert.ok(stats.goals <= stats.shotsOnTarget);
    assert.ok(stats.tacklesWon <= stats.tacklesAttempted);

    assert.ok(stats.passCompletionPct >= 0);
    assert.ok(stats.passCompletionPct <= 100);
    assert.ok(stats.possessionPct >= 0);
    assert.ok(stats.possessionPct <= 100);
  }

  let previous = null;

  for (const second of [
    0, 1, 60, 900, 1800, 2700, 3600, 4500, 5400,
  ]) {
    const stats = calculateMatchStats(match, second);

    assert.equal(
      stats.home.possessionSeconds +
        stats.away.possessionSeconds,
      second,
    );

    assert.equal(
      stats.processedEvents,
      match.events.filter(
        (event) => event.elapsedSeconds <= second,
      ).length,
    );

    if (previous !== null) {
      assert.ok(stats.processedEvents >= previous.processedEvents);

      for (const side of ["home", "away"]) {
        for (const field of [
          "goals",
          "shots",
          "shotsOnTarget",
          "passesAttempted",
          "passesCompleted",
          "tacklesAttempted",
          "tacklesWon",
          "pressuresApplied",
          "possessionSeconds",
        ]) {
          assert.ok(stats[side][field] >= previous[side][field]);
        }
      }
    }

    // Seeking directly to a timestamp must match the stats engine.
    const state = seekReplay(
      createReplayState(match),
      match,
      second,
    );

    const frame = getReplayFrame(match, state);

    assert.deepEqual(frame.stats, stats);
    assert.deepEqual(
      frame.latestEvent,
      stats.processedEvents > 0
        ? match.events[stats.processedEvents - 1]
        : null,
    );

    assert.ok(frame.recentEvents.length <= 6);

    previous = stats;
  }
}

function validateReplay(match) {
  for (const speed of [1, 4, 16]) {
    let initial = createReplayState(match);
    initial = setReplaySpeed(initial, speed);
    initial = playReplay(initial, match);

    // Continuous and segmented time updates must agree.
    const continuous = advanceReplay(
      initial,
      match,
      5000,
    );

    let segmented = initial;

    for (let index = 0; index < 50; index++) {
      segmented = advanceReplay(segmented, match, 100);
    }

    assert.deepEqual(segmented, continuous);
    assert.equal(
      continuous.elapsedSeconds,
      speed * 5,
    );

    // Pause freezes time.
    const paused = pauseReplay(continuous);
    assert.deepEqual(
      advanceReplay(paused, match, 5000),
      paused,
    );

    // Restart resets time but retains selected speed.
    const restarted = restartReplay(paused);

    assert.equal(restarted.elapsedSeconds, 0);
    assert.equal(restarted.status, "paused");
    assert.equal(restarted.speed, speed);
  }

  const finalState = seekReplay(
    createReplayState(match),
    match,
    match.metadata.durationSeconds,
  );

  assert.equal(finalState.status, "finished");
  assert.equal(
    getReplayFrame(match, finalState).stats.processedEvents,
    match.events.length,
  );

  assert.throws(() =>
    seekReplay(createReplayState(match), match, -1),
  );

  assert.throws(() =>
    setReplaySpeed(createReplayState(match), 2),
  );

  assert.throws(() =>
    advanceReplay(createReplayState(match), match, -1),
  );
}

console.log("\nMATCHWORK INTEGRATION ACCEPTANCE");
console.log("--------------------------------");

for (const seed of seeds) {
  for (const eventCount of eventCounts) {
    const options = { seed, eventCount };

    const match = generateSyntheticMatch(demoMatch, options);
    const repeated = generateSyntheticMatch(demoMatch, options);

    assert.equal(match.events.length, eventCount);
    assert.deepEqual(match.events, repeated.events);

    validateEvents(match);
    validateStatistics(match);
    validateReplay(match);

    scenariosPassed++;
    eventsAudited += eventCount;

    console.log(
      `PASS seed=${seed} events=${eventCount}`,
    );
  }
}

console.log("--------------------------------");
console.log("Scenarios passed:", scenariosPassed);
console.log("Events audited:", eventsAudited);
console.log("Multi-seed determinism: PASSED");
console.log("Event and player integrity: PASSED");
console.log("Possession transitions: PASSED");
console.log("Statistics reconciliation: PASSED");
console.log("Replay consistency: PASSED");
console.log("\nALL INTEGRATION CHECKS PASSED");
