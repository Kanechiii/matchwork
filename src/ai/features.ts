import type { MatchEvent, SyntheticMatch, TeamId } from "../types/match";

export const FEATURE_NAMES = [
  "pass_completion",
  "pressure_rate",
  "turnover_rate",
  "shot_rate",
  "event_tempo",
  "attacking_third_rate",
  "score_tension",
] as const;

export const STATE_LABELS = ["CONTROL", "PRESSURE", "TRANSITION"] as const;
export type MatchStateLabel = (typeof STATE_LABELS)[number];

export interface WindowFeatures {
  startSeconds: number;
  endSeconds: number;
  eventIds: string[];
  eventCount: number;
  passesAttempted: number;
  passesCompleted: number;
  pressures: number;
  turnovers: number;
  shots: number;
  attackingThirdEvents: number;
  values: number[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function attacksInFinalThird(event: MatchEvent, homeId: TeamId): boolean {
  const attackingHome = event.teamId === homeId;
  if (event.type === "pressure" || event.type === "tackle") return false;
  return attackingHome ? event.x >= 66 : event.x <= 34;
}

/** Only uses events at or before the replay clock: safe from future-data leakage. */
export function extractWindowFeatures(
  match: SyntheticMatch,
  elapsedSeconds: number,
  lookbackSeconds = 180,
): WindowFeatures {
  if (
    !Number.isSafeInteger(elapsedSeconds) ||
    elapsedSeconds < 0 ||
    elapsedSeconds > match.metadata.durationSeconds ||
    !Number.isSafeInteger(lookbackSeconds) ||
    lookbackSeconds <= 0
  ) {
    throw new Error("Invalid feature window");
  }
  const startSeconds = Math.max(0, elapsedSeconds - lookbackSeconds);
  // Deduplicate by event ID and use chronological order even if an upstream
  // fixture arrives unsorted. Counts and evidence must describe the same set.
  const seen = new Set<string>();
  const events = match.events.filter((event) => {
    if (event.elapsedSeconds > elapsedSeconds ||
        event.elapsedSeconds < startSeconds || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || a.sequence - b.sequence);
  const passes = events.filter((e) => e.type === "pass");
  const completed = passes.filter((e) => e.type === "pass" && e.completed).length;
  const pressures = events.filter((e) => e.type === "pressure").length;
  const turnovers = events.filter((e) => e.type === "possession_change").length;
  const shots = events.filter((e) => e.type === "shot").length;
  const attacking = events.filter((e) =>
    attacksInFinalThird(e, match.metadata.homeTeam.id),
  ).length;

  let homeGoals = 0;
  let awayGoals = 0;
  const scored = new Set<string>();
  for (const event of match.events) {
    if (event.elapsedSeconds > elapsedSeconds || scored.has(event.id)) continue;
    scored.add(event.id);
    if (event.type === "shot" && event.outcome === "goal") {
      if (event.teamId === match.metadata.homeTeam.id) homeGoals += 1;
      else awayGoals += 1;
    }
  }

  const n = Math.max(1, events.length);
  // Normalization constants are fixed in the training script.
  const values = [
    passes.length ? completed / passes.length : 0.5,
    clamp01((pressures / n) / 0.24),
    clamp01((turnovers / n) / 0.22),
    clamp01((shots / n) / 0.12),
    clamp01((events.length / Math.max(30, Math.min(lookbackSeconds, elapsedSeconds))) / 0.34),
    attacking / n,
    1 / (1 + Math.abs(homeGoals - awayGoals)),
  ];

  return {
    startSeconds, endSeconds: elapsedSeconds,
    eventIds: events.map((event) => event.id),
    eventCount: events.length,
    passesAttempted: passes.length,
    passesCompleted: completed,
    pressures, turnovers, shots, attackingThirdEvents: attacking,
    values,
  };
}
