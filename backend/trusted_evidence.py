"""Checksum-verified, read-only ledgers for all seeded fictional fixtures.

Exported by scripts/exportReplay.mjs from the exact frontend fixtures. Unknown
matches, altered metadata, malformed events or future citations fail closed.
"""
import hashlib
import json
from functools import lru_cache
from pathlib import Path
from fastapi import HTTPException

MATCH_ID = "matchwork-demo-001"
MATCH_IDS = tuple(f"matchwork-demo-{i:03d}" for i in range(1, 10))
LEDGER = Path(__file__).resolve().parent / "data" / "replay.json"
DATA_DIR = LEDGER.parent

@lru_cache(maxsize=9)
def load_replay(match_id: str = MATCH_ID) -> dict:
    if match_id not in MATCH_IDS:
        raise HTTPException(422, "Unknown canonical fixture")
    path = LEDGER if match_id == MATCH_ID else DATA_DIR / f"replay-{match_id}.json"
    index = MATCH_IDS.index(match_id)
    expected_seed = 2026 if index == 0 else 2026 + index * 917
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        events = payload["events"]
        home, away = payload["home_team"], payload["away_team"]
        if (payload["schema_version"] != 1 or payload["match_id"] != match_id or
                payload["seed"] != expected_seed or payload["event_count"] != 1200 or
                payload["duration_seconds"] != 5400 or len(events) != 1200 or
                home["id"] == away["id"] or
                not all(isinstance(t["id"], str) and isinstance(t["name"], str)
                        and 1 <= len(t["id"]) <= 50 and 1 <= len(t["name"]) <= 100
                        for t in (home, away))):
            raise ValueError("Unexpected canonical fixture metadata")
        digest = hashlib.sha256(
            json.dumps(events, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        if payload["events_sha256"] != digest:
            raise ValueError("Replay checksum mismatch")
        if any(event["id"] != f"evt-{i:04d}" or
               event["sequence"] != i or
               not isinstance(event["elapsedSeconds"], int) or
               event["elapsedSeconds"] < 0 or
               event["elapsedSeconds"] >= 5400 or
               event["teamId"] not in (home["id"], away["id"])
               for i, event in enumerate(events, 1)):
            raise ValueError("Replay IDs or timestamps invalid")
        return payload
    except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
        raise HTTPException(503, "Authoritative replay unavailable") from exc


def resolve_evidence(match_id: str, as_of_seconds: int, evidence_ids: list[str]) -> dict:
    if match_id not in MATCH_IDS or not evidence_ids or len(evidence_ids) > 10:
        raise HTTPException(422, "Invalid match or evidence selection")
    if len(evidence_ids) != len(set(evidence_ids)):
        raise HTTPException(422, "Duplicate evidence IDs")
    if as_of_seconds < 0 or as_of_seconds > 5400:
        raise HTTPException(422, "Invalid replay timestamp")
    payload = load_replay(match_id)
    events = payload["events"]
    by_id = {event["id"]: event for event in events}
    try:
        selected = [by_id[event_id] for event_id in evidence_ids]
    except (KeyError, TypeError):
        raise HTTPException(422, "Unknown evidence ID") from None
    if any(event["elapsedSeconds"] > as_of_seconds for event in selected):
        raise HTTPException(422, "Future evidence is not allowed")
    selected.sort(key=lambda event: (event["elapsedSeconds"], event["sequence"]))
    last = selected[-1]
    teams = {
        payload["home_team"]["id"]: payload["home_team"]["name"],
        payload["away_team"]["id"]: payload["away_team"]["name"],
    }
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
        elif kind == "possession_change":
            detail = "possession changed: " + event["reason"]
        else:
            raise HTTPException(503, "Unknown canonical event type")
        return f'{teams[event["teamId"]]} {detail} at {event["elapsedSeconds"]}s'
    home_id = payload["home_team"]["id"]
    away_id = payload["away_team"]["id"]
    home_goals = sum(1 for e in events if e["elapsedSeconds"] <= as_of_seconds and
                     e["type"] == "shot" and e["outcome"] == "goal" and e["teamId"] == home_id)
    away_goals = sum(1 for e in events if e["elapsedSeconds"] <= as_of_seconds and
                     e["type"] == "shot" and e["outcome"] == "goal" and e["teamId"] == away_id)
    return {
        "minute": last["elapsedSeconds"] / 60,
        "event_type": last["type"],
        "team": teams[last["teamId"]],
        "description": "; ".join(describe(e) for e in selected),
        "score": f"{home_goals} - {away_goals}",
        "evidence_ids": [e["id"] for e in selected],
        "statistics": {"selected_events": len(selected)},
    }
