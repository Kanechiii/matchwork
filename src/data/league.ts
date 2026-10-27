import { demoMatch } from "./demoMatch.ts";
import { generateSyntheticMatch } from "../engine/generateEvents.ts";
import type { MatchMetadata, SyntheticMatch, Team, Position } from "../types/match.ts";

const roster = (prefix: string, names: string[]): Team["players"] =>
  names.map((name, i) => ({
    id: `${prefix}${String(i + 1).padStart(2, "0")}`,
    name,
    shirtNumber: i + 1,
    position: (i === 0 ? "GK" : i <= 4 ? "DEF" : i <= 8 ? "MID" : "FWD") as Position,
  }));

const newTeams: Team[] = [
  { id: "cedarvale", name: "Cedarvale Athletic", abbreviation: "CDA", color: "#00a58d", players: roster("cda", ["Arlo Chen","Benicio Ward","Colin Ray","Dario West","Emil Stone","Finn Keller","Gabriel Parks","Hugo Lane","Ilan Cole","Jude Hayes","Kieran Nash"]) },
  { id: "ironcrest", name: "Ironcrest United", abbreviation: "ICU", color: "#b783f2", players: roster("icu", ["Liam Dunn","Mateo Knox","Nico Hardy","Owen Brooks","Pablo Rhodes","Quinn Barrett","Rafael Price","Samir Voss","Tariq Wynn","Uri Hale","Victor Ames"]) },
  { id: "westmere", name: "Westmere City", abbreviation: "WMC", color: "#e8a542", players: roster("wmc", ["Wes Ford","Xavier Reed","Yousef Mills","Zane Ortiz","Aiden Holt","Bruno Mason","Cameron Finch","Dante Wells","Elias Morgan","Fabian Snow","Gavin Shaw"]) },
  { id: "stonehaven", name: "Stonehaven FC", abbreviation: "SHF", color: "#e76b86", players: roster("shf", ["Harper Quinn","Isaiah Blake","Jonas Frost","Keon Miles","Leon Vale","Mika Rowan","Nolan Cross","Oscar Flynn","Perry Cole","Remy Pierce","Silas North"]) },
];
export const leagueTeams: Team[] = [demoMatch.homeTeam, demoMatch.awayTeam, ...newTeams];
const byId = new Map(leagueTeams.map(team => [team.id, team]));
const fixtures: Array<[string, string, string]> = [
  ["northbridge","harborpoint","Matchday 1"],
  ["cedarvale","ironcrest","Matchday 1"],
  ["westmere","stonehaven","Matchday 1"],
  ["northbridge","cedarvale","Matchday 2"],
  ["harborpoint","westmere","Matchday 2"],
  ["ironcrest","stonehaven","Matchday 2"],
  ["westmere","northbridge","Matchday 3"],
  ["stonehaven","harborpoint","Matchday 3"],
  ["ironcrest","cedarvale","Matchday 3"],
];
export interface LeagueFixture { id: string; round: string; match: SyntheticMatch }
export const leagueFixtures: LeagueFixture[] = fixtures.map(([homeId, awayId, round], index) => {
  const homeTeam = byId.get(homeId)!;
  const awayTeam = byId.get(awayId)!;
  const metadata: MatchMetadata = index === 0 ? demoMatch : {
    id: `matchwork-demo-${String(index + 1).padStart(3, "0")}`,
    title: `${homeTeam.name} vs ${awayTeam.name}`,
    synthetic: true,
    durationSeconds: 5400,
    homeTeam,
    awayTeam,
  };
  return { id: metadata.id, round, match: generateSyntheticMatch(metadata, {seed: index === 0 ? 2026 : 2026 + index * 917}) };
});
