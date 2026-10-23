
import type { SyntheticMatch, TeamId } from "../types/match";

export interface TeamStats {
  teamId: TeamId;

  goals: number;
  shots: number;
  shotsOnTarget: number;

  passesAttempted: number;
  passesCompleted: number;
  passCompletionPct: number;

  tacklesAttempted: number;
  tacklesWon: number;
  pressuresApplied: number;

  possessionSeconds: number;
  possessionPct: number;
}

export interface MatchStatsSnapshot {
  matchId: string;
  elapsedSeconds: number;
  processedEvents: number;

  home: TeamStats;
  away: TeamStats;
}

function emptyTeamStats(teamId: TeamId): TeamStats {
  return {
    teamId,

    goals: 0,
    shots: 0,
    shotsOnTarget: 0,

    passesAttempted: 0,
    passesCompleted: 0,
    passCompletionPct: 0,

    tacklesAttempted: 0,
    tacklesWon: 0,
    pressuresApplied: 0,

    possessionSeconds: 0,
    possessionPct: 0,
  };
}

function percent(
  numerator: number,
  denominator: number,
): number {
  if (denominator === 0) return 0;

  return Math.round(
    (numerator / denominator) * 10000,
  ) / 100;
}

export function calculateMatchStats(
  match: SyntheticMatch,
  throughSeconds: number = match.metadata.durationSeconds,
): MatchStatsSnapshot {
  const { metadata, events } = match;
  const duration = metadata.durationSeconds;

  if (
    !Number.isSafeInteger(duration) ||
    duration <= 0
  ) {
    throw new Error("Invalid match duration");
  }

  if (
    !Number.isSafeInteger(throughSeconds) ||
    throughSeconds < 0 ||
    throughSeconds > duration
  ) {
    throw new Error(
      "throughSeconds is outside the match clock",
    );
  }

  if (
    metadata.homeTeam.id === metadata.awayTeam.id
  ) {
    throw new Error(
      "Match teams must have distinct IDs",
    );
  }

  const home = emptyTeamStats(metadata.homeTeam.id);
  const away = emptyTeamStats(metadata.awayTeam.id);

  function teamStats(teamId: TeamId): TeamStats {
    if (teamId === home.teamId) return home;
    if (teamId === away.teamId) return away;

    throw new Error(`Unknown team: ${teamId}`);
  }

  // The synthetic generator begins with home possession.
  let possession: TeamId = home.teamId;

  let lastClock = 0;
  let lastEventClock = -1;
  let processedEvents = 0;

  const seenIds = new Set<string>();

  for (const [index, event] of events.entries()) {
    if (
      event.sequence !== index + 1 ||
      seenIds.has(event.id) ||
      !Number.isSafeInteger(event.elapsedSeconds) ||
      event.elapsedSeconds < lastEventClock ||
      event.elapsedSeconds < 0 ||
      event.elapsedSeconds > duration
    ) {
      throw new Error(
        `Invalid event order, ID, or time at index ${index}`,
      );
    }

    seenIds.add(event.id);
    lastEventClock = event.elapsedSeconds;

    // Stop at the requested replay timestamp.
    if (event.elapsedSeconds > throughSeconds) {
      break;
    }

    // Attribute time since the previous event to the
    // team controlling possession during that interval.
    teamStats(possession).possessionSeconds +=
      event.elapsedSeconds - lastClock;

    lastClock = event.elapsedSeconds;

    const actor = teamStats(event.teamId);

    switch (event.type) {
      case "pass": {
        if (event.teamId !== possession) {
          throw new Error(
            "Pass attributed to team without possession",
          );
        }

        actor.passesAttempted += 1;

        if (event.completed) {
          actor.passesCompleted += 1;
        }

        break;
      }

      case "shot": {
        if (event.teamId !== possession) {
          throw new Error(
            "Shot attributed to team without possession",
          );
        }

        actor.shots += 1;

        if (
          event.outcome === "goal" ||
          event.outcome === "saved"
        ) {
          actor.shotsOnTarget += 1;
        }

        if (event.outcome === "goal") {
          actor.goals += 1;
        }

        break;
      }

      case "tackle": {
        if (event.teamId === possession) {
          throw new Error(
            "Tackle must be attributed to defending team",
          );
        }

        actor.tacklesAttempted += 1;

        if (event.wonBall) {
          actor.tacklesWon += 1;
        }

        break;
      }

      case "pressure": {
        if (event.teamId === possession) {
          throw new Error(
            "Pressure must be attributed to defending team",
          );
        }

        actor.pressuresApplied += 1;
        break;
      }

      case "possession_change": {
        if (
          event.fromTeamId !== possession ||
          event.teamId === possession
        ) {
          throw new Error(
            "Invalid possession transition",
          );
        }

        possession = event.teamId;
        break;
      }
    }

    processedEvents += 1;
  }

  // Include the time between the last processed event
  // and the requested match-clock timestamp.
  teamStats(possession).possessionSeconds +=
    throughSeconds - lastClock;

  for (const stats of [home, away]) {
    stats.passCompletionPct = percent(
      stats.passesCompleted,
      stats.passesAttempted,
    );

    stats.possessionPct = percent(
      stats.possessionSeconds,
      throughSeconds,
    );
  }

  return {
    matchId: metadata.id,
    elapsedSeconds: throughSeconds,
    processedEvents,
    home,
    away,
  };
}
