
import type { MatchMetadata } from "../types/match";

export const demoMatch: MatchMetadata = {
  id: "matchwork-demo-001",
  title: "Northbridge Rovers vs Harborpoint FC",
  synthetic: true,
  durationSeconds: 90 * 60,

  homeTeam: {
    id: "northbridge",
    name: "Northbridge Rovers",
    abbreviation: "NBR",
    color: "#2563eb",
    players: [
      { id: "nbr01", name: "Leo Marin", shirtNumber: 1, position: "GK" },
      { id: "nbr02", name: "Ethan Vale", shirtNumber: 2, position: "DEF" },
      { id: "nbr03", name: "Noah Pierce", shirtNumber: 3, position: "DEF" },
      { id: "nbr04", name: "Daniel Frost", shirtNumber: 4, position: "DEF" },
      { id: "nbr05", name: "Isaac Reed", shirtNumber: 5, position: "DEF" },
      { id: "nbr06", name: "Oliver Shaw", shirtNumber: 6, position: "MID" },
      { id: "nbr07", name: "Mason Holt", shirtNumber: 8, position: "MID" },
      { id: "nbr08", name: "Lucas Quinn", shirtNumber: 10, position: "MID" },
      { id: "nbr09", name: "Adam Cross", shirtNumber: 11, position: "MID" },
      { id: "nbr10", name: "Felix Stone", shirtNumber: 7, position: "FWD" },
      { id: "nbr11", name: "Ryan Cole", shirtNumber: 9, position: "FWD" }
    ]
  },

  awayTeam: {
    id: "harborpoint",
    name: "Harborpoint FC",
    abbreviation: "HFC",
    color: "#ef4444",
    players: [
      { id: "hfc01", name: "Alex Rowan", shirtNumber: 1, position: "GK" },
      { id: "hfc02", name: "Theo Bennett", shirtNumber: 2, position: "DEF" },
      { id: "hfc03", name: "Caleb Wright", shirtNumber: 3, position: "DEF" },
      { id: "hfc04", name: "Oscar Blake", shirtNumber: 4, position: "DEF" },
      { id: "hfc05", name: "Nathan Brooks", shirtNumber: 5, position: "DEF" },
      { id: "hfc06", name: "Henry Flynn", shirtNumber: 6, position: "MID" },
      { id: "hfc07", name: "Aaron Miles", shirtNumber: 8, position: "MID" },
      { id: "hfc08", name: "Jamie Wells", shirtNumber: 10, position: "MID" },
      { id: "hfc09", name: "Dylan Rhodes", shirtNumber: 11, position: "MID" },
      { id: "hfc10", name: "Eli Parker", shirtNumber: 7, position: "FWD" },
      { id: "hfc11", name: "Kai Morgan", shirtNumber: 9, position: "FWD" }
    ]
  }
};
