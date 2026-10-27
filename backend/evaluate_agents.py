"""Reproducible, zero-cost multi-agent quality evaluation.

All cases use fake model responses. Measures correctness of orchestration and
citation enforcement, NOT real Foundry linguistic quality or groundedness.
"""
from __future__ import annotations
import argparse
import asyncio
import json
from pathlib import Path
from .ai_budget import FoundryBudget
from .multi_agent import orchestrate_foundry_insight


def scenarios():
    base = {
        "minute": 78, "event_type": "shot", "team": "Northbridge",
        "description": "A shot was saved after completed passes",
        "score": "1 - 1", "evidence_ids": ["evt-0001", "evt-0002"],
        "statistics": {"shots": 3},
    }
    return [
        {"name": "fan_success", "event": base, "audience": "fan", "mode": "success",
         "expected_status": "success", "expected_calls": 2},
        {"name": "analyst_success", "event": base, "audience": "analyst", "mode": "success",
         "expected_status": "success", "expected_calls": 2},
        {"name": "future_citation_rejected", "event": base, "audience": "analyst",
         "mode": "future", "expected_status": "audit_rejected", "expected_calls": 1},
        {"name": "narrator_invents_citation", "event": base, "audience": "fan",
         "mode": "extra", "expected_status": "audit_rejected", "expected_calls": 2},
        {"name": "provider_unavailable", "event": base, "audience": "fan",
         "mode": "outage", "expected_status": "agent_failed", "expected_calls": 1},
        {"name": "empty_evidence", "event": {**base, "evidence_ids": []},
         "audience": "fan", "mode": "success",
         "expected_status": "insufficient_evidence", "expected_calls": 0},
        {"name": "disabled", "event": base, "audience": "fan", "mode": "success",
         "enabled": False, "expected_status": "multi_agent_disabled", "expected_calls": 0},
        {"name": "budget_denies_narrator", "event": base, "audience": "analyst",
         "mode": "success", "hourly_limit": 1,
         "expected_status": "ai_hourly_limited", "expected_calls": 1},
    ]


async def evaluate_case(case):
    async def fake(role, instructions, payload):
        if case["mode"] == "outage":
            raise ConnectionError("simulated")
        if role == "tactical_analyst":
            citations = ["future-0003"] if case["mode"] == "future" else ["evt-0001"]
            return json.dumps({
                "finding": "The shot was saved following completed passes.",
                "evidence_ids": citations,
            })
        citations = ["evt-0002"] if case["mode"] == "extra" else ["evt-0001"]
        return json.dumps({
            "explanation": "A saved shot followed a passing move.",
            "evidence_ids": citations,
        })
    result = await orchestrate_foundry_insight(
        case["event"], case["audience"],
        "Safe deterministic recap.",
        model_call=fake,
        enabled=case.get("enabled", True),
        budget=FoundryBudget(hourly_limit=case.get("hourly_limit", 20)),
    )
    expected = case["expected_status"]
    matched = (result["status"] == expected
               and result["model_calls"] == case["expected_calls"])
    if expected == "success":
        matched = (matched and result["source"] == "foundry"
                   and set(result["evidence_ids"]).issubset(
                       set(case["event"]["evidence_ids"])))
    else:
        matched = (matched and result["source"] == "rule-based"
                   and result["explanation"] == "Safe deterministic recap.")
    return {
        "case": case["name"],
        "passed": bool(matched),
        "expected_status": expected,
        "actual_status": result["status"],
        "model_calls": result["model_calls"],
    }


async def run():
    cases = [await evaluate_case(s) for s in scenarios()]
    count = sum(x["passed"] for x in cases)
    return {
        "evaluation_type": "offline_mocked_orchestration",
        "provider_requests": 0,
        "case_count": len(cases),
        "passed": count,
        "pass_rate": round(count / len(cases), 4),
        "cases": cases,
        "disclaimer": "Not a Foundry evaluation or measure of model accuracy.",
    }


def main():
    parser = argparse.ArgumentParser(description="No-cost Matchwork orchestration evaluation")
    parser.add_argument("--output", help="Optional JSON report path; avoid committing generated reports")
    args = parser.parse_args()
    result = asyncio.run(run())
    report = json.dumps(result, indent=2)
    print(report)
    if args.output:
        Path(args.output).write_text(report + "\n", encoding="utf-8")
    return 0 if result["passed"] == result["case_count"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
