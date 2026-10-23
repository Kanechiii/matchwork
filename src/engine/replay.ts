
import type { MatchEvent, SyntheticMatch } from "../types/match";
import type { MatchStatsSnapshot } from "./calculateStats";
import { calculateMatchStats } from "./calculateStats.ts";

export const REPLAY_SPEEDS = [1, 4, 16] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];
export type ReplayStatus = "paused" | "playing" | "finished";

export interface ReplayState {
  elapsedSeconds: number;
  carryMilliseconds: number;
  status: ReplayStatus;
  speed: ReplaySpeed;
}

export interface ReplayFrame {
  state: ReplayState;
  stats: MatchStatsSnapshot;
  recentEvents: MatchEvent[];
  latestEvent: MatchEvent | null;
}

function durationOf(match: SyntheticMatch): number {
  const seconds = match.metadata.durationSeconds;

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error("Invalid match duration");
  }

  return seconds;
}

export function createReplayState(
  match: SyntheticMatch,
): ReplayState {
  durationOf(match);

  return {
    elapsedSeconds: 0,
    carryMilliseconds: 0,
    status: "paused",
    speed: 1,
  };
}

export function playReplay(
  state: ReplayState,
  match: SyntheticMatch,
): ReplayState {
  if (state.elapsedSeconds >= durationOf(match)) {
    return {
      ...state,
      status: "finished",
      carryMilliseconds: 0,
    };
  }

  return { ...state, status: "playing" };
}

export function pauseReplay(
  state: ReplayState,
): ReplayState {
  return state.status === "playing"
    ? { ...state, status: "paused" }
    : state;
}

export function restartReplay(
  state: ReplayState,
): ReplayState {
  return {
    ...state,
    elapsedSeconds: 0,
    carryMilliseconds: 0,
    status: "paused",
  };
}

export function seekReplay(
  state: ReplayState,
  match: SyntheticMatch,
  second: number,
): ReplayState {
  const duration = durationOf(match);

  if (
    !Number.isSafeInteger(second) ||
    second < 0 ||
    second > duration
  ) {
    throw new Error("Seek time is outside the match clock");
  }

  return {
    ...state,
    elapsedSeconds: second,
    carryMilliseconds: 0,
    status: second === duration ? "finished" : "paused",
  };
}

export function setReplaySpeed(
  state: ReplayState,
  speed: number,
): ReplayState {
  if (!REPLAY_SPEEDS.some((value) => value === speed)) {
    throw new Error("Unsupported playback speed");
  }

  return { ...state, speed: speed as ReplaySpeed };
}

export function advanceReplay(
  state: ReplayState,
  match: SyntheticMatch,
  deltaMilliseconds: number,
): ReplayState {
  if (
    !Number.isFinite(deltaMilliseconds) ||
    deltaMilliseconds < 0
  ) {
    throw new Error(
      "Elapsed real time must be finite and nonnegative",
    );
  }

  if (state.status !== "playing") {
    return state;
  }

  const duration = durationOf(match);

  const simulatedMilliseconds =
    state.carryMilliseconds +
    deltaMilliseconds * state.speed;

  const wholeSeconds = Math.floor(
    simulatedMilliseconds / 1000,
  );

  const elapsedSeconds = Math.min(
    duration,
    state.elapsedSeconds + wholeSeconds,
  );

  if (elapsedSeconds >= duration) {
    return {
      ...state,
      elapsedSeconds: duration,
      carryMilliseconds: 0,
      status: "finished",
    };
  }

  return {
    ...state,
    elapsedSeconds,
    carryMilliseconds: simulatedMilliseconds % 1000,
  };
}

export function getReplayFrame(
  match: SyntheticMatch,
  state: ReplayState,
): ReplayFrame {
  const stats = calculateMatchStats(
    match,
    state.elapsedSeconds,
  );

  const visibleCount = stats.processedEvents;

  const recentEvents = match.events.slice(
    Math.max(0, visibleCount - 6),
    visibleCount,
  );

  return {
    state,
    stats,
    recentEvents,
    latestEvent: recentEvents.at(-1) ?? null,
  };
}
