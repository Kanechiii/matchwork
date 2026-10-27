import type { SyntheticMatch } from "../types/match.ts";

export interface PlayerStats {
  playerId: string; teamId: string; name: string; number: number; position: string;
  appearances: number; goals: number; shots: number; shotsOnTarget: number;
  passesAttempted: number; passesCompleted: number; passesReceived: number;
  tacklesAttempted: number; tacklesWon: number; pressures: number;
  passCompletionPct: number; evidenceIds: string[];
}
export function calculatePlayerStats(match: SyntheticMatch, seconds = match.metadata.durationSeconds): PlayerStats[] {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > match.metadata.durationSeconds) throw new Error("Invalid player-stat replay clock");
  const players: PlayerStats[] = [match.metadata.homeTeam, match.metadata.awayTeam].flatMap(team =>
    team.players.map(player => ({
      playerId: player.id, teamId: team.id, name: player.name, number: player.shirtNumber, position: player.position,
      appearances: 1, goals: 0, shots: 0, shotsOnTarget: 0, passesAttempted: 0, passesCompleted: 0,
      passesReceived: 0, tacklesAttempted: 0, tacklesWon: 0, pressures: 0, passCompletionPct: 0, evidenceIds: [],
    }))
  );
  const index = new Map(players.map(p => [p.playerId, p]));
  const seen = new Set<string>();
  for (const event of match.events) {
    if (event.elapsedSeconds > seconds || seen.has(event.id)) continue;
    seen.add(event.id);
    const actor = index.get(event.playerId);
    if (!actor || actor.teamId !== event.teamId) throw new Error("Invalid player/team reference");
    actor.evidenceIds.push(event.id);
    if (event.type === "shot") {
      actor.shots++;
      if (event.outcome === "goal" || event.outcome === "saved") actor.shotsOnTarget++;
      if (event.outcome === "goal") actor.goals++;
    } else if (event.type === "pass") {
      actor.passesAttempted++;
      if (event.completed) {
        actor.passesCompleted++;
        const receiver = index.get(event.receiverId);
        if (!receiver || receiver.teamId !== actor.teamId) throw new Error("Invalid pass receiver");
        receiver.passesReceived++;
        receiver.evidenceIds.push(event.id);
      }
    } else if (event.type === "tackle") {
      actor.tacklesAttempted++;
      if (event.wonBall) actor.tacklesWon++;
    } else if (event.type === "pressure") actor.pressures++;
  }
  for (const p of players) p.passCompletionPct = p.passesAttempted ? Math.round(p.passesCompleted / p.passesAttempted * 1000) / 10 : 0;
  return players;
}
export function aggregatePlayerStats(matches: SyntheticMatch[]): PlayerStats[] {
  const aggregate = new Map<string, PlayerStats>();
  for (const match of matches) for (const p of calculatePlayerStats(match)) {
    const prev = aggregate.get(p.playerId);
    if (!prev) { aggregate.set(p.playerId, {...p, evidenceIds: p.evidenceIds.map(id => `${match.metadata.id}:${id}`)}); continue; }
    if (prev.teamId !== p.teamId) throw new Error("Player identity reused by multiple teams");
    for (const key of ["appearances","goals","shots","shotsOnTarget","passesAttempted","passesCompleted","passesReceived","tacklesAttempted","tacklesWon","pressures"] as const) prev[key] += p[key];
    prev.evidenceIds.push(...p.evidenceIds.map(id => `${match.metadata.id}:${id}`));
  }
  return Array.from(aggregate.values()).map(p => ({...p, passCompletionPct: p.passesAttempted ? Math.round(p.passesCompleted / p.passesAttempted * 1000) / 10 : 0}));
}
