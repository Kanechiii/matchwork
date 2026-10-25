import type { MatchPrediction } from "./inference.ts";

export const INFERENCE_SAMPLE_SECONDS = 15;
export type InferenceStatus = "loading" | "ready" | "unavailable";

export interface ReplayInferenceState {
  asOfSeconds: number;
  status: InferenceStatus;
  prediction: MatchPrediction | null;
  error: string;
}

/** The classifier samples at 15-second boundaries, not every replay second. */
export function sampleReplaySeconds(replaySeconds: number): number {
  if (!Number.isSafeInteger(replaySeconds) || replaySeconds < 0) {
    throw new Error("Invalid replay sampling time");
  }
  return Math.floor(replaySeconds / INFERENCE_SAMPLE_SECONDS) * INFERENCE_SAMPLE_SECONDS;
}

/**
 * Select exactly one self-consistent time window for the insight and scores.
 * The scoreboard, live event feed, and recap remain at the actual replay clock.
 */
export function selectReplayInference(
  replaySeconds: number,
  state: ReplayInferenceState,
): ReplayInferenceState {
  const asOfSeconds = sampleReplaySeconds(replaySeconds);
  if (state.asOfSeconds !== asOfSeconds) {
    return { asOfSeconds, status: "loading", prediction: null, error: "" };
  }
  if (state.status !== "ready") {
    return {
      asOfSeconds,
      status: state.status,
      prediction: null,
      error: state.status === "unavailable" ? state.error : "",
    };
  }
  if (state.prediction?.asOfSeconds !== asOfSeconds) {
    // A response for another replay window is never treated as current.
    return { asOfSeconds, status: "loading", prediction: null, error: "" };
  }
  return { asOfSeconds, status: "ready", prediction: state.prediction, error: "" };
}
