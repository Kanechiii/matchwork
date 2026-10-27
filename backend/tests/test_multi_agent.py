import asyncio
import json
import unittest

from backend.ai_budget import FoundryBudget
from backend.multi_agent import orchestrate_foundry_insight

EVENT = {
    "minute": 78.0, "event_type": "shot", "team": "Northbridge",
    "description": "Shot saved after a completed passing move",
    "score": "1 - 1", "evidence_ids": ["evt-001", "evt-002"],
    "statistics": {"shots": 3},
}


class MultiAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_disabled_uses_no_paid_calls(self):
        async def forbidden(*args):
            self.fail("Model must not be called when disabled")
        result = await orchestrate_foundry_insight(EVENT, "fan", "Fallback", model_call=forbidden, enabled=False)
        self.assertEqual(result["status"], "multi_agent_disabled")
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(len(result["trace"]), 2)

    async def test_two_distinct_roles_with_audited_handoff(self):
        calls = []
        async def fake(role, prompt, payload):
            calls.append((role, prompt, payload))
            if role == "tactical_analyst":
                self.assertEqual(payload["allowed_evidence_ids"], EVENT["evidence_ids"])
                return json.dumps({"finding": "Three observed shots.", "evidence_ids": ["evt-001"]})
            self.assertEqual(role, "narrative_agent")
            self.assertEqual(payload["analyst_evidence_ids"], ["evt-001"])
            self.assertEqual(payload["tactical_finding"], "Three observed shots.")
            return json.dumps({"explanation": "A saved shot brought pressure.", "evidence_ids": ["evt-001"]})
        guard = FoundryBudget(hourly_limit=2, daily_limit=2)
        result = await orchestrate_foundry_insight(EVENT, "fan", "Fallback", model_call=fake, budget=guard, enabled=True)
        self.assertEqual(result["source"], "foundry")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["model_calls"], 2)
        self.assertEqual([c[0] for c in calls], ["tactical_analyst", "narrative_agent"])
        self.assertEqual([t["agent"] for t in result["trace"]],
                         ["intake", "tactical_analyst", "narrative_agent", "evidence_auditor"])
        second = await orchestrate_foundry_insight(EVENT, "fan", "Fallback", model_call=fake, budget=guard, enabled=True)
        self.assertEqual(second["status"], "ai_hourly_limited")
        self.assertEqual(second["model_calls"], 0)

    async def test_reject_invalid_analyst_ids_no_second_model_call(self):
        calls = []
        async def fake(role, prompt, payload):
            calls.append(role)
            return '{"finding":"fiction","evidence_ids":["future-event"]}'
        result = await orchestrate_foundry_insight(EVENT, "fan", "Verified fallback", model_call=fake, enabled=True)
        self.assertEqual(result["status"], "audit_rejected")
        self.assertEqual(result["source"], "rule-based")
        self.assertEqual(result["model_calls"], 1)
        self.assertEqual(calls, ["tactical_analyst"])

    async def test_reject_narrator_extra_evidence(self):
        async def fake(role, prompt, payload):
            if role == "tactical_analyst":
                return '{"finding":"A pass", "evidence_ids":["evt-001"]}'
            return '{"explanation":"Other action","evidence_ids":["evt-002"]}'
        result = await orchestrate_foundry_insight(EVENT, "analyst", "Safe", model_call=fake, enabled=True)
        self.assertEqual(result["status"], "audit_rejected")
        self.assertEqual(result["model_calls"], 2)

    async def test_second_agent_outage_recovers_and_releases_budget(self):
        guard = FoundryBudget(hourly_limit=3)
        async def fake(role, prompt, payload):
            if role == "narrative_agent":
                raise TimeoutError("simulated failure")
            return '{"finding":"Saved shot","evidence_ids":["evt-001"]}'
        result = await orchestrate_foundry_insight(EVENT, "fan", "Safe", model_call=fake, budget=guard, enabled=True)
        self.assertEqual(result["status"], "agent_failed")
        self.assertEqual(result["explanation"], "Safe")
        self.assertEqual(result["model_calls"], 2)
        self.assertIsNone(guard.acquire())
        guard.release()

    async def test_first_agent_rate_budget_blocks_second(self):
        guard = FoundryBudget(hourly_limit=1)
        async def fake(role, prompt, payload):
            return '{"finding":"Saved shot","evidence_ids":["evt-001"]}'
        result = await orchestrate_foundry_insight(EVENT, "fan", "Safe", model_call=fake, budget=guard, enabled=True)
        self.assertEqual(result["status"], "ai_hourly_limited")
        self.assertEqual(result["model_calls"], 1)

    async def test_empty_evidence_does_not_call_foundry(self):
        async def forbidden(*args):
            self.fail("Must not invoke provider without evidence")
        result = await orchestrate_foundry_insight({**EVENT, "evidence_ids": []}, "fan", "Safe", model_call=forbidden, enabled=True)
        self.assertEqual(result["status"], "insufficient_evidence")
        self.assertEqual(result["model_calls"], 0)


if __name__ == "__main__":
    unittest.main()
