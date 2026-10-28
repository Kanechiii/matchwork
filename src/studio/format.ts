import type { MatchEvent, Player, Position, SyntheticMatch, Team } from "../types/match";

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

export function describeEvent(event: MatchEvent): string {
  switch (event.type) {
    case "pass":
      return event.completed
        ? "Completed pass"
        : "Incomplete pass";

    case "shot":
      return `Shot — ${event.outcome.replaceAll("_", " ")}`;

    case "tackle":
      return event.wonBall
        ? "Successful tackle"
        : "Unsuccessful tackle";

    case "pressure":
      return `Defensive pressure — level ${event.intensity}`;

    case "possession_change":
      return `Possession change — ${event.reason.replaceAll(
        "_",
        " ",
      )}`;
  }
}

export const POSITION_NAMES: Record<Position, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export interface RosterEntry {
  player: Player;
  team: Team;
  side: "home" | "away";
}

/** Player ID → player, club and side for the two teams in a synthetic match. */
export function buildRoster(match: SyntheticMatch): Map<string, RosterEntry> {
  const roster = new Map<string, RosterEntry>();
  const sides = [
    [match.metadata.homeTeam, "home"],
    [match.metadata.awayTeam, "away"],
  ] as const;
  for (const [team, side] of sides) {
    for (const player of team.players) roster.set(player.id, { player, team, side });
  }
  return roster;
}

/**
 * Pitch zone from the acting team's point of view. The generator attacks home
 * toward x = 100 and away toward x = 0; thirds match the model's 66/34 cut-offs.
 */
export function describeZone(event: MatchEvent, homeId: string): string {
  const progress = event.teamId === homeId ? event.x : 100 - event.x;
  const third = progress >= 66 ? "Attacking third" : progress > 34 ? "Middle third" : "Defensive third";
  const channel = event.y < 30 || event.y > 70 ? "wide channel" : "central channel";
  return `${third} · ${channel}`;
}

const SHOT_OUTCOMES = { goal: "Goal scored", saved: "Saved by the keeper", blocked: "Blocked", off_target: "Off target" } as const;

/** One-line, data-only detail for an event (receiver, outcome, intensity…). */
export function describeEventDetail(event: MatchEvent, roster: Map<string, RosterEntry>, teams: Team[]): string {
  const who = (id?: string) => {
    const entry = id ? roster.get(id) : undefined;
    return entry ? `#${entry.player.shirtNumber} ${entry.player.name}` : "a teammate";
  };
  switch (event.type) {
    case "pass":
      return `${event.completed ? "Found" : "Intended for"} ${who(event.receiverId)}`;
    case "shot":
      return `${SHOT_OUTCOMES[event.outcome]}${event.shotSpeedKmh ? ` · ${event.shotSpeedKmh} km/h` : ""}`;
    case "tackle":
      return event.wonBall ? "Won the ball back" : "Opponent kept the ball";
    case "pressure":
      return `Intensity ${event.intensity}/3${event.targetPlayerId ? ` on ${who(event.targetPlayerId)}` : ""}`;
    case "possession_change": {
      const from = teams.find((team) => team.id === event.fromTeamId);
      return `Won from ${from?.name ?? "the opponent"} · ${event.reason.replaceAll("_", " ")}`;
    }
  }
}
