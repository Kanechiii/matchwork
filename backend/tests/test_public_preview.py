"""Public judging preview: verified data, same-origin guard, caching and quotas.

These tests mock the model; they never contact Azure.
"""
import os
import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.ai_budget import foundry_budget
from backend.shared_budget import SharedAttemptLedger

ORIGIN = "https://matchwork.example.test"
PAYLOAD = {
    "match_id": "matchwork-demo-001",
    "as_of_seconds": 900,
    "audience": "fan",
}


class FakeRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    def time(self):
        return (1782640800, 0)

    def eval(self, script, numkeys, hour_key, day_key, hourly_limit, daily_limit, hour_expire, day_expire):
        hour = self.values.get(hour_key, 0)
        day = self.values.get(day_key, 0)
        if hour >= hourly_limit:
            return 1
        if day >= daily_limit:
            return 2
        self.values[hour_key] = hour + 1
        self.values[day_key] = day + 1
        return 0


class PublicPreviewTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "MATCHWORK_PUBLIC_ORIGIN": ORIGIN,
            "MATCHWORK_PUBLIC_AI_ENABLED": "true",
            "MATCHWORK_SHARED_BUDGET_ENABLED": "true",
            "MATCHWORK_PUBLIC_AI_MAX_CALLS_PER_HOUR": "4",
            "MATCHWORK_PUBLIC_AI_MAX_CALLS_PER_DAY": "10",
        })
        self.env.start()
        self.addCleanup(self.env.stop)
        self.redis = FakeRedis()
        self.ledger = patch.object(foundry_budget, "_shared_ledger", SharedAttemptLedger(self.redis))
        self.ledger.start()
        self.addCleanup(self.ledger.stop)
        self.client = TestClient(app, base_url=ORIGIN)

    def request(self, payload=None, origin=ORIGIN):
        return self.client.post(
            "/api/public/agents/insights",
            json=payload or PAYLOAD,
            headers={"Origin": origin},
        )

    def test_verified_evidence_and_shared_cache(self):
        calls = []

        async def model(evidence, audience, fallback):
            calls.append((evidence, audience))
            return {
                "source": "foundry",
                "explanation": "Observed fictional events support a cautious interpretation.",
                "evidence_ids": evidence["evidence_ids"],
                "status": "success",
                "model_calls": 2,
                "trace": [{"agent": "evidence_auditor", "status": "ok", "detail": "Validated"}],
            }

        with patch("backend.main.orchestrate_foundry_insight", new=AsyncMock(side_effect=model)):
            first = self.request()
            second = self.request()

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["source"], "foundry")
        self.assertEqual(first.json(), second.json())
        self.assertEqual(len(calls), 1, "Cached response must avoid repeat paid calls")
        self.assertEqual(calls[0][1], "fan")
        self.assertTrue(1 <= len(calls[0][0]["evidence_ids"]) <= 5)
        self.assertEqual(first.json()["evidence_ids"], calls[0][0]["evidence_ids"])

    def test_origin_and_schema_rejected(self):
        self.assertEqual(self.request(origin="https://external.example").status_code, 403)
        self.assertEqual(self.request(origin="").status_code, 403)
        self.assertEqual(self.request(payload={**PAYLOAD, "match_id": "invented"}).status_code, 422)
        self.assertEqual(self.request(payload={**PAYLOAD, "as_of_seconds": 5401}).status_code, 422)

    def test_disabled_and_missing_redis_fail_closed(self):
        with patch.dict(os.environ, {"MATCHWORK_PUBLIC_AI_ENABLED": "false"}):
            self.assertEqual(self.request().json()["status"], "public_preview_disabled")
        with patch.dict(os.environ, {"MATCHWORK_SHARED_BUDGET_ENABLED": "false"}):
            self.assertEqual(self.request().json()["status"], "ai_budget_unavailable")

    def test_public_hourly_budget_is_bounded(self):
        async def model(evidence, audience, fallback):
            return {
                "source": "foundry", "explanation": "Verified synthetic fixture observation.",
                "evidence_ids": evidence["evidence_ids"],
                "status": "success", "model_calls": 2, "trace": [],
            }

        with patch.dict(os.environ, {"MATCHWORK_PUBLIC_AI_MAX_CALLS_PER_HOUR": "1"}), patch(
            "backend.main.orchestrate_foundry_insight", new=AsyncMock(side_effect=model)
        ) as invoke:
            self.assertEqual(self.request().json()["source"], "foundry")
            limited = self.request(payload={**PAYLOAD, "as_of_seconds": 1200}).json()
            self.assertEqual(limited["source"], "rule-based")
            self.assertEqual(limited["status"], "ai_hourly_limited")
            self.assertEqual(invoke.await_count, 1)


if __name__ == "__main__":
    unittest.main()
