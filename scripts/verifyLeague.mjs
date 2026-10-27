import assert from "node:assert/strict";
import { leagueFixtures, leagueTeams } from "../src/data/league.ts";
import { calculateMatchStats } from "../src/engine/calculateStats.ts";
import { calculatePlayerStats, aggregatePlayerStats } from "../src/engine/calculatePlayerStats.ts";
assert.equal(leagueTeams.length, 6);
assert.equal(leagueFixtures.length, 9);
assert.equal(new Set(leagueTeams.flatMap(t => t.players.map(p => p.id))).size, 66);
const aggregate = aggregatePlayerStats(leagueFixtures.map(f => f.match));
assert.equal(aggregate.length, 66);
for (const {match} of leagueFixtures) {
  const stats = calculateMatchStats(match);
  const players = calculatePlayerStats(match);
  assert.equal(players.reduce((n,p) => n + p.goals,0), stats.home.goals + stats.away.goals);
  assert.equal(players.reduce((n,p) => n + p.shots,0), stats.home.shots + stats.away.shots);
  assert.equal(players.reduce((n,p) => n + p.passesAttempted,0), stats.home.passesAttempted + stats.away.passesAttempted);
  assert.equal(players.reduce((n,p) => n + p.tacklesWon,0), stats.home.tacklesWon + stats.away.tacklesWon);
  for (const t of [0,14,15,16,29,30,5400]) {
    const snapshot = calculatePlayerStats(match,t);
    assert.equal(snapshot.reduce((n,p)=>n+p.shots,0), match.events.filter(e => e.elapsedSeconds <= t && e.type === "shot").length);
    assert.ok(snapshot.every(p => p.evidenceIds.every(id => match.events.some(e=>e.id===id && e.elapsedSeconds <= t))));
  }
}
console.log("PHASE 8 LEAGUE: PASS — six fictional teams, nine deterministic fixtures, 66 reconciled player profiles");
