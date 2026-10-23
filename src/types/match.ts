
export type TeamId = "northbridge" | "harborpoint";

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  shirtNumber: number;
  position: Position;
}

export interface Team {
  id: TeamId;
  name: string;
  abbreviation: string;
  color: string;
  players: Player[];
}

export interface MatchMetadata {
  id: string;
  title: string;
  synthetic: true;
  durationSeconds: number;
  homeTeam: Team;
  awayTeam: Team;
}

// All event positions use normalized pitch coordinates:
// x = 0-100 (pitch length)
// y = 0-100 (pitch width)
//
// elapsedSeconds measures match-clock time.
// sequence resolves events that share a timestamp.

export interface BaseMatchEvent {
  id: string;
  sequence: number;
  elapsedSeconds: number;
  teamId: TeamId;
  playerId: string;
  x: number;
  y: number;
}

export interface PassEvent extends BaseMatchEvent {
  type: "pass";
  receiverId: string;
  endX: number;
  endY: number;
  completed: boolean;
}

export interface ShotEvent extends BaseMatchEvent {
  type: "shot";
  outcome: "goal" | "saved" | "blocked" | "off_target";
  shotSpeedKmh?: number;
}

export interface TackleEvent extends BaseMatchEvent {
  type: "tackle";
  wonBall: boolean;
}

export interface PressureEvent extends BaseMatchEvent {
  type: "pressure";
  intensity: 1 | 2 | 3;
  targetPlayerId?: string;
}

export interface PossessionChangeEvent extends BaseMatchEvent {
  type: "possession_change";
  fromTeamId: TeamId;
  reason: "interception" | "tackle" | "loose_ball" | "restart";
}

export type MatchEvent =
  | PassEvent
  | ShotEvent
  | TackleEvent
  | PressureEvent
  | PossessionChangeEvent;

export interface SyntheticMatch {
  metadata: MatchMetadata;
  events: MatchEvent[];
}
