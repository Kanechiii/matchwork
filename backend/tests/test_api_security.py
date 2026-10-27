"""API security regression tests; never contact Foundry."""
import os
import unittest
from unittest.mock import patch

try:
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.trusted_evidence import MATCH_ID
except ImportError:
    TestClient = None

VALID = {
    "match_id": "matchwork-curated-security-fixture-v1",
    "as_of_seconds": 4680,
    "evidence_ids": ["safe-pass-001", "safe-shot-001"],
    "audience": "analyst",
}
TOKEN = "development-only-testing-token-0123456789abcdefgh"


@unittest.skipIf(TestClient is None, "Requires backend FastAPI dependencies")
class AuthEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "MATCHWORK_API_ACCESS_TOKEN": TOKEN,
            "MATCHWORK_MULTI_AGENT_ENABLED": "false",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.client = TestClient(app)

    def request(self, path, payload=VALID, token=None):
        headers = {"Authorization": "Bearer " + token} if token else {}
        return self.client.post(path, json=payload, headers=headers)

    def test_both_paid_routes_reject_missing_and_bad_credentials(self):
        for path in ["/api/insights", "/api/agents/insights"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path).status_code, 401)
                self.assertEqual(self.request(path, token="invalid").status_code, 401)
                with patch("backend.main.foundry_budget.acquire", return_value="ai_disabled"):
                    self.assertEqual(self.request(path, token=TOKEN).status_code, 200)

    def test_missing_config_fails_closed(self):
        with patch.dict(os.environ, {"MATCHWORK_API_ACCESS_TOKEN": ""}):
            self.assertEqual(self.request("/api/agents/insights", token=TOKEN).status_code, 503)

    def test_fabricated_and_future_events_rejected(self):
        for payload in [
            {**VALID, "evidence_ids": ["evt-0001"]},
            {**VALID, "as_of_seconds": 4675},
            {**VALID, "evidence_ids": ["safe-shot-001", "safe-shot-001"]},
            {**VALID, "match_id": "fake-match"},
        ]:
            with self.subTest(payload=payload):
                self.assertEqual(
                    self.request("/api/agents/insights", payload, TOKEN).status_code,
                    422,
                )

    def test_legacy_untrusted_body_cannot_be_submitted(self):
        self.assertEqual(
            self.request("/api/agents/insights", {
                "audience": "fan",
                "event": {"description": "invented goal", "evidence_ids": ["evt-fake"]},
                "fallback_text": "fake output",
            }, TOKEN).status_code, 422,
        )

    def test_health_is_public_and_disabled_agent_is_rule_based(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        response = self.request("/api/agents/insights", token=TOKEN)
        self.assertEqual(response.json()["model_calls"], 0)
        self.assertEqual(response.json()["status"], "multi_agent_disabled")
        self.assertEqual(
            response.json()["evidence_ids"], ["safe-pass-001", "safe-shot-001"]
        )


if __name__ == "__main__":
    unittest.main()
