"""Read-only canonical ledger exported from the TypeScript seeded replay.

The checked-in generator is authoritative. The export is produced with
`node scripts/exportReplay.mjs` during local setup, CI and Docker build.
Missing or tampered output fails closed before any Foundry requests.
"""
import hashlib
import json
from functools import lru_cache
from pathlib import Path
from fastapi import HTTPException

MATCH_ID = "matchwork-demo-001"
LEDGER = Path(__file__).resolve().parent / "data" / "replay.json"

@lru_cache(maxsize=1)
def load_replay() -> dict:
    try:
        payload = json.loads(LEDGER.read_text(encoding="utf-8"))
        events = payload["events"]
        if (payload["schema_version"] != 1 or payload["match_id"] != MATCH_ID
                or payload["seed"] != 2026 or payload["event_count"] != 1200
                or payload["duration_seconds"] != 5400 or len(events) != 1200):
            raise ValueError("Unexpected canonical replay metadata")
        digest = hashlib.sha256(
            json.dumps(events, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        if payload["events_sha256"] != digest:
            raise ValueError("Replay checksum mismatch")
        if any(event["id"] != f"evt-{i:04d}" or
               event["sequence"] != i or
               not isinstance(event["elapsedSeconds"], int) or
               event["elapsedSeconds"] < 0 or
               event["elapsedSeconds"] >= 5400
               for i, event in enumerate(events, 1)):
            raise ValueError("Replay IDs or timestamps invalid")
        return payload
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(503, "Authoritative replay unavailable") from exc


def resolve_evidence(match_id: str, as_of_seconds: int, evidence_ids: list[str]) -> dict:
    if match_id != MATCH_ID or not evidence_ids or len(evidence_ids) > 10:
        raise HTTPException(422, "Invalid match or evidence selection")
    if len(evidence_ids) != len(set(evidence_ids)):
        raise HTTPException(422, "Duplicate evidence IDs")
    if as_of_seconds < 0 or as_of_seconds > 5400:
        raise HTTPException(422, "Invalid replay timestamp")
    events = load_replay()["events"]
    by_id = {event["id"]: event for event in events}
    try:
        selected = [by_id[event_id] for event_id in evidence_ids]
    except (KeyError, TypeError):
        raise HTTPException(422, "Unknown evidence ID") from None
    if any(event["elapsedSeconds"] > as_of_seconds for event in selected):
        raise HTTPException(422, "Future evidence is not allowed")
    selected.sort(key=lambda event: (event["elapsedSeconds"], event["sequence"]))
    last = selected[-1]
    team_names = {"northbridge": "Northbridge Rovers", "harborpoint": "Harborpoint FC"}
    def describe(event):
        kind = event["type"]
        if kind == "pass":
            detail = "completed pass" if event["completed"] else "incomplete pass"
        elif kind == "shot":
            detail = "shot: " + event["outcome"]
        elif kind == "tackle":
            detail = "tackle won" if event["wonBall"] else "unsuccessful tackle"
        elif kind == "pressure":
            detail = "pressure, intensity " + str(event["intensity"])
        else:
            detail = "possession changed: " + event["reason"]
        return f'{team_names[event["teamId"]]} {detail} at {event["elapsedSeconds"]}s'
    # Score is computed only from completed goals up to the requested clock,
    # never accepted as a caller-controlled fact.
    home_goals = sum(1 for e in events if e["elapsedSeconds"] <= as_of_seconds and e["type"] == "shot" and e["outcome"] == "goal" and e["teamId"] == "northbridge")
    away_goals = sum(1 for e in events if e["elapsedSeconds"] <= as_of_seconds and e["type"] == "shot" and e["outcome"] == "goal" and e["teamId"] == "harborpoint")
    return {
        "minute": last["elapsedSeconds"] / 60,
        "event_type": last["type"],
        "team": team_names[last["teamId"]],
        "description": "; ".join(describe(e) for e in selected),
        "score": f"{home_goals} - {away_goals}",
        "evidence_ids": [e["id"] for e in selected],
        "statistics": {"selected_events": len(selected)},
    }
