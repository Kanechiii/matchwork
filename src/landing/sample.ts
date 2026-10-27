import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchEvent, SyntheticMatch } from "../types/match";
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
      recap: neutralRecap(match, time),
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

/** The studio's own recap, with club names swapped for Home/Away so the landing page stays team-agnostic. */
export function neutralRecap(match: SyntheticMatch, seconds: number) {
  return buildMatchRecap(match, seconds)
    .replaceAll(match.metadata.homeTeam.name, "the home side")
    .replaceAll(match.metadata.awayTeam.name, "the away side");
}

export type MinuteBin = { home: number; away: number };

/** Events per match minute for each side: the data behind the activity strip. */
export function useMinuteBins(match: SyntheticMatch) {
  return useMemo(() => {
    const minutes = Math.ceil(match.metadata.durationSeconds / 60);
    const bins: MinuteBin[] = Array.from({ length: minutes }, () => ({ home: 0, away: 0 }));
    for (const event of match.events) {
      const bin = bins[Math.min(minutes - 1, Math.floor(event.elapsedSeconds / 60))];
      if (event.teamId === match.metadata.homeTeam.id) bin.home += 1; else bin.away += 1;
    }
    const max = Math.max(1, ...bins.map((b) => Math.max(b.home, b.away)));
    const goals = match.events.filter((e) => e.type === "shot" && e.outcome === "goal");
    return { bins, max, goals };
  }, [match]);
}

const side = (match: SyntheticMatch, teamId: string) => (teamId === match.metadata.homeTeam.id ? "Home" : "Away");

/** Plain-language, team-agnostic label for a notable event. */
export function readEvent(match: SyntheticMatch, event: MatchEvent): string {
  const s = side(match, event.teamId);
  switch (event.type) {
    case "shot":
      return event.outcome === "goal" ? `Goal for ${s.toLowerCase()}` : `${s} shot ${event.outcome === "off_target" ? "off target" : event.outcome}`;
    case "possession_change":
      return `${s} win it back by ${event.reason === "loose_ball" ? "a loose ball" : event.reason === "restart" ? "a restart" : `${event.reason === "interception" ? "an" : "a"} ${event.reason}`}`;
    case "tackle":
      return event.wonBall ? `${s} win a tackle` : `${s} tackle beaten`;
    case "pressure":
      return `${s} press at level ${event.intensity}`;
    case "pass":
      return event.completed ? `${s} keep the ball moving` : `${s} pass goes astray`;
  }
}

/** Rules-based read of the latest three minutes, from the same window features the studio uses. */
export function readWindow(match: SyntheticMatch, seconds: number) {
  const features = extractWindowFeatures(match, seconds);
  const ids = new Set(features.eventIds);
  const windowEvents = match.events.filter((e) => ids.has(e.id));
  const homeId = match.metadata.homeTeam.id;
  let homeThird = 0, awayThird = 0;
  for (const e of windowEvents) {
    if (e.type === "pressure" || e.type === "tackle") continue;
    if (e.teamId === homeId && e.x >= 66) homeThird += 1;
    if (e.teamId !== homeId && e.x <= 34) awayThird += 1;
  }
  const notable = match.events.filter((e) => e.elapsedSeconds <= seconds && (e.type === "shot" || e.type === "possession_change" || (e.type === "tackle" && e.wonBall))).at(-1) ?? null;
  return { features, homeThird, awayThird, notable, cites: features.eventIds.slice(-4) };
}
