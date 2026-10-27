"""Server-owned, bounded, curated synthetic-evidence fixture.

This is an isolated illustrative Matchwork fixture, NOT the same event sequence
as React's seeded 1,200-event replay. Do not claim replay integration until a
canonical export of the frontend generator is shipped and verified.
"""
from copy import deepcopy
from fastapi import HTTPException

MATCH_ID = "matchwork-curated-security-fixture-v1"
EVIDENCE = {
    "safe-shot-001": {
        "id": "safe-shot-001",
        "elapsed_seconds": 4680,
        "event_type": "shot",
        "team": "Northbridge",
        "description": "A shot was saved",
        "score": "1 - 1",
    },
    "safe-pass-001": {
        "id": "safe-pass-001",
        "elapsed_seconds": 4670,
        "event_type": "pass",
        "team": "Northbridge",
        "description": "A completed pass",
        "score": "1 - 1",
    },
    "safe-pressure-001": {
        "id": "safe-pressure-001",
        "elapsed_seconds": 4690,
        "event_type": "pressure",
        "team": "Harborpoint",
        "description": "A defensive pressure event",
        "score": "1 - 1",
    },
}


def resolve_evidence(match_id: str, as_of_seconds: int, evidence_ids: list[str]) -> dict:
    if match_id != MATCH_ID or not evidence_ids or len(evidence_ids) > 10:
        raise HTTPException(422, "Unrecognized match or evidence selection")
    if len(evidence_ids) != len(set(evidence_ids)):
        raise HTTPException(422, "Duplicate evidence IDs")
    if as_of_seconds < 0 or as_of_seconds > 5400:
        raise HTTPException(422, "Invalid replay timestamp")
    try:
        selected = [deepcopy(EVIDENCE[event_id]) for event_id in evidence_ids]
    except KeyError:
        raise HTTPException(422, "Unknown evidence ID") from None
    if any(event["elapsed_seconds"] > as_of_seconds for event in selected):
        raise HTTPException(422, "Future evidence is not allowed")
    selected.sort(key=lambda event: (event["elapsed_seconds"], event["id"]))
    event = selected[-1]
    return {
        "minute": event["elapsed_seconds"] / 60,
        "event_type": event["event_type"],
        "team": event["team"],
        "description": "; ".join(item["description"] for item in selected),
        "score": event["score"],
        "evidence_ids": [item["id"] for item in selected],
        "statistics": {"selected_events": len(selected)},
    }
