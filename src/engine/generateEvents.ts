
import type {
  MatchEvent,
  MatchMetadata,
  SyntheticMatch,
  Team,
  TeamId,
} from "../types/match";

export interface GeneratorOptions {
  seed?: number;
  eventCount?: number;
}

type ChangeReason =
  | "interception"
  | "tackle"
  | "loose_ball"
  | "restart";

interface PendingChange {
  from: TeamId;
  to: TeamId;
  reason: ChangeReason;
  restartAtCenter: boolean;
}

// A seeded random-number generator.
// It never calls Math.random(), so results are reproducible.
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOutfieldPlayer(
  team: Team,
  random: () => number,
  excludeId?: string,
): string {
  const eligible = team.players.filter(
    (player) =>
      player.position !== "GK" && player.id !== excludeId,
  );

  return eligible[Math.floor(random() * eligible.length)]!.id;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function generateSyntheticMatch(
  metadata: MatchMetadata,
  options: GeneratorOptions = {},
): SyntheticMatch {
  const { seed = 2026, eventCount = 1200 } = options;

  // Validate generator inputs before creating events.
  if (
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  ) {
    throw new Error("seed must be an unsigned 32-bit integer");
  }

  if (
    !Number.isInteger(eventCount) ||
    eventCount < 900 ||
    eventCount > 1400
  ) {
    throw new Error(
      "eventCount must be an integer between 900 and 1400",
    );
  }

  if (
    !Number.isSafeInteger(metadata.durationSeconds) ||
    metadata.durationSeconds <= 0
  ) {
    throw new Error("durationSeconds must be a positive integer");
  }

  if (
    metadata.homeTeam.id === metadata.awayTeam.id ||
    metadata.homeTeam.players.length !== 11 ||
    metadata.awayTeam.players.length !== 11
  ) {
    throw new Error(
      "A match requires two different teams with 11 players each",
    );
  }

  const playerIds = [
    ...metadata.homeTeam.players.map((player) => player.id),
    ...metadata.awayTeam.players.map((player) => player.id),
  ];

  if (new Set(playerIds).size !== 22) {
    throw new Error("Every player must have a unique ID");
  }

  for (const team of [metadata.homeTeam, metadata.awayTeam]) {
    if (
      team.players.filter((player) => player.position !== "GK")
        .length < 2
    ) {
      throw new Error(
        "Each team must have at least two outfield players",
      );
    }
  }

  const random = makeRandom(seed);
  const events: MatchEvent[] = [];

  const homeId = metadata.homeTeam.id;
  const awayId = metadata.awayTeam.id;

  const teamFor = (id: TeamId): Team =>
    id === homeId ? metadata.homeTeam : metadata.awayTeam;

  const opposing = (id: TeamId): TeamId =>
    id === homeId ? awayId : homeId;

  // Initial simulated match state.
  let possession: TeamId = homeId;
  let carrierId = pickOutfieldPlayer(metadata.homeTeam, random);
  let ballX = 50;
  let ballY = 50;

  let pending: PendingChange | null = null;

  for (let index = 0; index < eventCount; index += 1) {
    const sequence = index + 1;

    // Spread events over the match clock in chronological order.
    const elapsedSeconds = Math.floor(
      (index * metadata.durationSeconds) / eventCount,
    );

    // Resolve a turnover on the event immediately following it.
    if (pending !== null) {
      const change = pending;

      if (change.restartAtCenter) {
        ballX = 50;
        ballY = 50;
      }

      const newCarrierId = pickOutfieldPlayer(
        teamFor(change.to),
        random,
      );

      events.push({
        id: `evt-${String(sequence).padStart(4, "0")}`,
        sequence,
        elapsedSeconds,
        x: ballX,
        y: ballY,
        type: "possession_change",
        teamId: change.to,
        playerId: newCarrierId,
        fromTeamId: change.from,
        reason: change.reason,
      });

      possession = change.to;
      carrierId = newCarrierId;
      pending = null;

      continue;
    }

    const base = {
      id: `evt-${String(sequence).padStart(4, "0")}`,
      sequence,
      elapsedSeconds,
      x: ballX,
      y: ballY,
    };

    const defender = opposing(possession);
    const homeInPossession = possession === homeId;

    // Home attacks toward x=100, away attacks toward x=0.
    const nearGoal = homeInPossession
      ? ballX >= 72
      : ballX <= 28;

    const roll = random();
    const finalEvent = index === eventCount - 1;

    // SHOT: only produced in the attacking third.
    if (!finalEvent && nearGoal && roll < 0.09) {
      const shotRoll = random();

      const outcome =
        shotRoll < 0.11
          ? "goal"
          : shotRoll < 0.48
            ? "saved"
            : shotRoll < 0.77
              ? "blocked"
              : "off_target";

      events.push({
        ...base,
        type: "shot",
        teamId: possession,
        playerId: carrierId,
        outcome,
        shotSpeedKmh: clamp(65 + random() * 65, 65, 130),
      });

      if (outcome === "goal" || outcome === "off_target") {
        pending = {
          from: possession,
          to: defender,
          reason: "restart",
          restartAtCenter: outcome === "goal",
        };
      } else if (outcome === "saved") {
        pending = {
          from: possession,
          to: defender,
          reason: "loose_ball",
          restartAtCenter: false,
        };
      } else if (random() < 0.3) {
        pending = {
          from: possession,
          to: defender,
          reason: "loose_ball",
          restartAtCenter: false,
        };
      }

    // PRESSURE: performed by a defending player.
    } else if (!finalEvent && roll < 0.20) {
      events.push({
        ...base,
        type: "pressure",
        teamId: defender,
        playerId: pickOutfieldPlayer(
          teamFor(defender),
          random,
        ),
        intensity: (1 + Math.floor(random() * 3)) as
          | 1
          | 2
          | 3,
        targetPlayerId: carrierId,
      });

    // TACKLE: a successful tackle transfers possession.
    } else if (!finalEvent && roll < 0.28) {
      const wonBall = random() < 0.32;

      events.push({
        ...base,
        type: "tackle",
        teamId: defender,
        playerId: pickOutfieldPlayer(
          teamFor(defender),
          random,
        ),
        wonBall,
      });

      if (wonBall) {
        pending = {
          from: possession,
          to: defender,
          reason: "tackle",
          restartAtCenter: false,
        };
      }

    // PASS: update ball position and current carrier.
    } else {
      const direction = homeInPossession ? 1 : -1;
      const backward = random() < 0.18;

      const distance =
        4 + random() * (backward ? 12 : 21);

      const endX = clamp(
        ballX +
          direction * distance * (backward ? -1 : 1),
        3,
        97,
      );

      const endY = clamp(
        ballY + (random() - 0.5) * 34,
        3,
        97,
      );

      const receiverId = pickOutfieldPlayer(
        teamFor(possession),
        random,
        carrierId,
      );

      // Always finish the dataset without an unresolved turnover.
      const completed = finalEvent || random() < 0.91;

      events.push({
        ...base,
        type: "pass",
        teamId: possession,
        playerId: carrierId,
        receiverId,
        endX,
        endY,
        completed,
      });

      ballX = endX;
      ballY = endY;

      if (completed) {
        carrierId = receiverId;
      } else {
        pending = {
          from: possession,
          to: defender,
          reason: "interception",
          restartAtCenter: false,
        };
      }
    }
  }

  return { metadata, events };
}
