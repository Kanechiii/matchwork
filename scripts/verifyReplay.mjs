
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

const match = generateSyntheticMatch(demoMatch);
let state = createReplayState(match);

assert.equal(state.elapsedSeconds, 0);
assert.equal(state.status, "paused");

// The first generated event occurs at 00:00.
assert.equal(
  getReplayFrame(match, state).stats.processedEvents,
  1,
);

// Paused matches must not advance.
assert.deepEqual(
  advanceReplay(state, match, 5000),
  state,
);

// Two half-second advances should equal one simulated second.
state = playReplay(state, match);
state = advanceReplay(state, match, 500);
assert.equal(state.elapsedSeconds, 0);

state = advanceReplay(state, match, 500);
assert.equal(state.elapsedSeconds, 1);

// Pause must freeze the match clock.
state = pauseReplay(state);

assert.equal(
  advanceReplay(state, match, 10000).elapsedSeconds,
  1,
);

// Playback speed must affect simulated time.
state = setReplaySpeed(state, 4);
state = playReplay(state, match);
state = advanceReplay(state, match, 1250);

assert.equal(state.elapsedSeconds, 6);

// Seeking must pause and recalculate the matching statistics.
state = seekReplay(state, match, 60);

assert.equal(state.status, "paused");
assert.equal(state.elapsedSeconds, 60);

const frame = getReplayFrame(match, state);

assert.deepEqual(
  frame.stats,
  calculateMatchStats(match, 60),
);

assert.equal(frame.recentEvents.length, 6);

assert.ok(
  frame.recentEvents.every(
    (event) => event.elapsedSeconds <= 60,
  ),
);

assert.deepEqual(
  frame.latestEvent,
  match.events[frame.stats.processedEvents - 1],
);

// Every event sharing the requested timestamp must be included.
const timestamp = match.events[40].elapsedSeconds;

const atTimestamp = getReplayFrame(
  match,
  seekReplay(state, match, timestamp),
);

assert.equal(
  atTimestamp.stats.processedEvents,
  match.events.filter(
    (event) => event.elapsedSeconds <= timestamp,
  ).length,
);

// Rewinding must remove future events from the visible snapshot.
const backward = getReplayFrame(
  match,
  seekReplay(state, match, 15),
);

assert.ok(
  backward.stats.processedEvents <
    frame.stats.processedEvents,
);

// Restart resets the clock while preserving playback speed.
state = restartReplay(state);

assert.equal(state.elapsedSeconds, 0);
assert.equal(state.carryMilliseconds, 0);
assert.equal(state.speed, 4);
assert.equal(state.status, "paused");

// Simulate reaching full time.
state = setReplaySpeed(state, 16);
state = playReplay(state, match);
state = advanceReplay(state, match, 540000);

assert.equal(state.elapsedSeconds, 5400);
assert.equal(state.status, "finished");

assert.equal(
  getReplayFrame(match, state).stats.processedEvents,
  1200,
);

assert.deepEqual(
  playReplay(state, match),
  state,
);

// Seeking to full time stays finished; earlier seeking pauses.
assert.equal(
  seekReplay(state, match, 5400).status,
  "finished",
);

assert.equal(
  seekReplay(state, match, 540).status,
  "paused",
);

// Invalid inputs must fail safely.
assert.throws(() => seekReplay(state, match, -1));
assert.throws(() => seekReplay(state, match, 5401));
assert.throws(() => seekReplay(state, match, 10.5));
assert.throws(() => setReplaySpeed(state, 3));
assert.throws(() => advanceReplay(state, match, -1));

// Identical playback instructions must produce identical results.
function runSequence() {
  let current = createReplayState(match);
  current = playReplay(current, match);

  for (const delta of [125, 125, 750, 1000, 1100]) {
    current = advanceReplay(current, match, delta);
  }

  return getReplayFrame(match, current);
}

assert.deepEqual(runSequence(), runSequence());

console.log("\nMATCHWORK REPLAY VERIFICATION");
console.log("--------------------------------");
console.log("Paused clock: PASSED");
console.log("Play / speed / fractional time: PASSED");
console.log("Seek / event sequencing / rewind: PASSED");
console.log("Statistics synchronization: PASSED");
console.log("Restart / finish boundaries: PASSED");
console.log("Determinism / invalid inputs: PASSED");
console.log("\nALL REPLAY CHECKS PASSED");
