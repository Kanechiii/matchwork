import { useCallback, useEffect, useMemo, useState } from "react";
import type { SyntheticMatch } from "../types/match";
import { createReplayState, getReplayFrame, seekReplay } from "../engine/replay";
import { extractWindowFeatures, type WindowFeatures } from "../ai/features";
import { buildMatchRecap } from "../ai/explanations";
import { predictMatchState, type MatchPrediction } from "../ai/inference";

export function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function frameAt(match: SyntheticMatch, seconds: number) {
  return getReplayFrame(match, seekReplay(createReplayState(match), match, seconds));
}

/** One real moment of the match, built with the same engine the studio uses. */
export function useSampleMoment(match: SyntheticMatch) {
  return useMemo(() => {
    // A goal after the opening 20 minutes gives the story a full window of play to read.
    const goals = match.events.filter((e) => e.type === "shot" && e.outcome === "goal");
    const goal = goals.find((e) => e.elapsedSeconds >= 1200) ?? goals[0];
    const time = Math.min(match.metadata.durationSeconds, goal ? goal.elapsedSeconds + 20 : 1458);
    const features = extractWindowFeatures(match, time);
    const ids = new Set(features.eventIds);
    return {
      time,
      frame: frameAt(match, time),
      features,
      recap: buildMatchRecap(match, time),
      windowEvents: match.events.filter((e) => ids.has(e.id)),
      trail: match.events.filter((e) => e.elapsedSeconds <= time),
    };
  }, [match]);
}

export type SampleModel = {
  status: "idle" | "loading" | "ready" | "unavailable";
  prediction: MatchPrediction | null;
};

/** Runs the real in-browser classifier for the sample window, only once something asks for it. */
export function useSampleModel(features: WindowFeatures) {
  const [state, setState] = useState<SampleModel>({ status: "idle", prediction: null });
  const request = useCallback(() => {
    setState((current) => (current.status === "idle" ? { status: "loading", prediction: null } : current));
  }, []);

  useEffect(() => {
    if (state.status !== "loading") return;
    let live = true;
    predictMatchState(features)
      .then((prediction) => { if (live) setState({ status: "ready", prediction }); })
      .catch(() => { if (live) setState({ status: "unavailable", prediction: null }); });
    return () => { live = false; };
  }, [state.status, features]);

  return { ...state, request };
}
