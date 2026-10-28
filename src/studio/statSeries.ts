import { calculateMatchStats, type MatchStatsSnapshot, type TeamStats } from "../engine/calculateStats.ts";
import type { SyntheticMatch } from "../types/match";

export const TIMELINE_STEP = 60;
export const PERIOD_SECONDS = 15 * 60;

/**
 * Snapshots from the existing statistics engine every minute of the match clock.
 * Trend and period charts read from these so they always agree with the live panel.
 */
export function buildStatTimeline(match: SyntheticMatch, step = TIMELINE_STEP): Map<number, MatchStatsSnapshot> {
  const duration = match.metadata.durationSeconds;
  const timeline = new Map<number, MatchStatsSnapshot>();
  for (let t = 0; t < duration; t += step) timeline.set(t, calculateMatchStats(match, t));
  timeline.set(duration, calculateMatchStats(match, duration));
  return timeline;
}

/** Baseline for the opening period, so events stamped exactly 0:00 are counted once. */
export const ZERO_TEAM_STATS: TeamStats = {
  teamId: "",
  goals: 0, shots: 0, shotsOnTarget: 0,
  passesAttempted: 0, passesCompleted: 0, passCompletionPct: 0,
  tacklesAttempted: 0, tacklesWon: 0, pressuresApplied: 0,
  possessionSeconds: 0, possessionPct: 0,
};

export interface StatMetric {
  key: string;
  label: string;
  unit?: "%";
  analystOnly?: boolean;
  /** Cumulative value at a snapshot, exactly as shown in the stats panel. */
  total: (stats: TeamStats) => number;
  /** Value inside a period, from the snapshots at its start and end. */
  period: (end: TeamStats, start: TeamStats, seconds: number) => number;
}

const pct = (numerator: number, denominator: number) => (denominator > 0 ? Math.round((100 * numerator) / denominator) : 0);
const delta = (key: keyof Pick<TeamStats, "shots" | "shotsOnTarget" | "tacklesWon" | "passesAttempted" | "passesCompleted" | "pressuresApplied">) =>
  (end: TeamStats, start: TeamStats) => end[key] - start[key];

export const STAT_METRICS: StatMetric[] = [
  { key: "possession", label: "Possession", unit: "%", total: (s) => Math.round(s.possessionPct), period: (e, s, sec) => pct(e.possessionSeconds - s.possessionSeconds, sec) },
  { key: "shots", label: "Shots", total: (s) => s.shots, period: delta("shots") },
  { key: "shotsOnTarget", label: "Shots on target", total: (s) => s.shotsOnTarget, period: delta("shotsOnTarget") },
  { key: "passAccuracy", label: "Pass accuracy", unit: "%", total: (s) => Math.round(s.passCompletionPct), period: (e, s) => pct(e.passesCompleted - s.passesCompleted, e.passesAttempted - s.passesAttempted) },
  { key: "tacklesWon", label: "Tackles won", total: (s) => s.tacklesWon, period: delta("tacklesWon") },
  { key: "passesAttempted", label: "Pass attempts", analystOnly: true, total: (s) => s.passesAttempted, period: delta("passesAttempted") },
  { key: "passesCompleted", label: "Completed passes", analystOnly: true, total: (s) => s.passesCompleted, period: delta("passesCompleted") },
  { key: "pressures", label: "Defensive pressures", analystOnly: true, total: (s) => s.pressuresApplied, period: delta("pressuresApplied") },
];

/** Rounds a chart maximum up to 4 × a 1/2/2.5/5 × 10ⁿ step so gridlines land on clean numbers. */
export function niceMax(value: number): number {
  const raw = Math.max(1, value) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return Math.max(4, step * 4);
}
