import type { MatchPrediction } from "./inference";
import type { WindowFeatures } from "./features";
import type { MatchEvent, SyntheticMatch, TeamId } from "../types/match";

export type AudienceMode = "fan" | "analyst";
export interface MatchInsight {
  headline: string;
  narrative: string;
  whyItMatters: string;
  evidence: string[];
  evidenceEventIds: string[];
  state: MatchPrediction["label"] | "AWAITING_MODEL";
  confidence: number | null;
  modelBacked: boolean;
}

function fmt(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function labelFor(label: MatchPrediction["label"]): string {
  return label === "CONTROL" ? "Steady control" : label === "PRESSURE"
    ? "Defensive pressure" : "End-to-end transitions";
}

export function explainMatchState(
  features: WindowFeatures,
  prediction: MatchPrediction | null,
  mode: AudienceMode,
  favoriteTeam: TeamId | "all",
  match: SyntheticMatch,
): MatchInsight {
  const home = match.metadata.homeTeam;
  const away = match.metadata.awayTeam;
  const clubName = favoriteTeam === "all" ? "Both teams" :
    favoriteTeam === home.id ? home.name : away.name;

  const evidence = [
    `${features.passesCompleted}/${features.passesAttempted} completed passes`,
    `${features.pressures} defensive pressures`,
    `${features.turnovers} changes of possession`,
    `${features.shots} shots`,
  ];

  // Cite the actual observed triggering events rather than inventing a reason.
  const ids = new Set(features.eventIds);
  const seen = new Set<string>();
  const relevant = match.events.filter((event) => {
    if (!ids.has(event.id) || seen.has(event.id) ||
        event.elapsedSeconds < features.startSeconds ||
        event.elapsedSeconds > features.endSeconds ||
        !["shot", "pressure", "possession_change", "pass"].includes(event.type)) return false;
    seen.add(event.id);
    return true;
  }).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || a.sequence - b.sequence);
  const evidenceEventIds = relevant.slice(-5).map((event) => event.id);
  // A prediction from an earlier inference window must never be described
  // as a classification of this newer observation window.
  const validPrediction = prediction?.asOfSeconds === features.endSeconds ? prediction : null;
  const heading = validPrediction ? labelFor(validPrediction.label) : "Model not available";
  const start = fmt(features.startSeconds);
  const end = fmt(features.endSeconds);
  const audience = favoriteTeam === "all" ? "the match" : clubName;

  if (!validPrediction) {
    return {
      headline: prediction ? "Prediction pending for current replay time" : "Match intelligence unavailable",
      narrative: `Observed event statistics remain available for ${audience} (${start}–${end}).`,
      whyItMatters: prediction
        ? `Previous synthetic-model output was as of ${fmt(prediction.asOfSeconds)}; it is not evidence for the current ${end} replay time.`
        : "AI classification requires ONNX Runtime Web. No prediction is fabricated when it cannot load.",
      evidence, evidenceEventIds, state: "AWAITING_MODEL",
      confidence: null, modelBacked: false,
    };
  }
  const descriptions: Record<MatchPrediction["label"], string> = {
    CONTROL: "Passing continuity and fewer disruptions resemble a more settled period of play.",
    PRESSURE: "Defensive pressure and attacking actions suggest a contested spell.",
    TRANSITION: "Possession switches and event tempo suggest an unsettled, transitional spell.",
  };
  return {
    headline: heading,
    narrative: mode === "fan"
      ? `${heading} around ${audience}. ${descriptions[validPrediction.label]}`
      : `${heading} (${(validPrediction.confidence * 100).toFixed(1)}% synthetic-model score), ${start}–${end}. ${descriptions[validPrediction.label]}`,
    whyItMatters: mode === "fan"
      ? "This helps explain the rhythm behind the scoreline, not just the latest event."
      : `Features: completion=${features.values[0].toFixed(2)}, pressure=${features.values[1].toFixed(2)}, turnovers=${features.values[2].toFixed(2)}, shots=${features.values[3].toFixed(2)}, tempo=${features.values[4].toFixed(2)}, territory=${features.values[5].toFixed(2)}, tension=${features.values[6].toFixed(2)}. Scores are model outputs, not calibrated real-world probabilities.`,
    evidence, evidenceEventIds,
    state: validPrediction.label, confidence: validPrediction.confidence,
    modelBacked: true,
  };
}

/** Recap is explicitly rule-generated from observed synthetic events. */
export function buildMatchRecap(match: SyntheticMatch, untilSeconds: number): string {
  if (!Number.isSafeInteger(untilSeconds) || untilSeconds < 0 ||
      untilSeconds > match.metadata.durationSeconds) throw new Error("Invalid recap time");
  const seen = new Set<string>();
  const visible = match.events.filter((e) => {
    if (e.elapsedSeconds > untilSeconds || seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  }).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || a.sequence - b.sequence);
  const shots = visible.filter((e) => e.type === "shot");
  const goals = shots.filter((e) => e.type === "shot" && e.outcome === "goal");
  const pressure = visible.filter((e) => e.type === "pressure").length;
  const turnovers = visible.filter((e) => e.type === "possession_change").length;
  const latestGoal = goals.at(-1) as Extract<MatchEvent, {type:"shot"}> | undefined;
  const highlight = latestGoal
    ? `Last goal: ${latestGoal.teamId === match.metadata.homeTeam.id ? match.metadata.homeTeam.name : match.metadata.awayTeam.name} at ${fmt(latestGoal.elapsedSeconds)}.`
    : "No goals recorded yet.";
  return `Through ${fmt(untilSeconds)}: ${shots.length} shots, ${goals.length} goals, ${pressure} pressures and ${turnovers} possession changes. ${highlight}`;
}
