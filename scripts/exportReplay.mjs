import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { demoMatch } from "../src/data/demoMatch.ts";
import { generateSyntheticMatch } from "../src/engine/generateEvents.ts";

const match = generateSyntheticMatch(demoMatch);
const payload = {
  schema_version: 1,
  match_id: match.metadata.id,
  duration_seconds: match.metadata.durationSeconds,
  seed: 2026,
  event_count: match.events.length,
  events: match.events,
};
const digest = createHash("sha256")
  .update(JSON.stringify(payload.events)).digest("hex");
const document = { ...payload, events_sha256: digest };
mkdirSync("backend/data", { recursive: true });
writeFileSync("backend/data/replay.json", JSON.stringify(document) + "\n", "utf8");
console.log(`Exported ${payload.event_count} canonical replay events, hash ${digest}`);
