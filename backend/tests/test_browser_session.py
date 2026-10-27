import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

TOKEN = "operator-testing-password-0123456789-abcdefghijklmn"
KEY = "signing-key-0123456789-abcdefghijklmnop"
ORIGIN = "https://matchwork.example.test"
REQUEST = {"match_id": "matchwork-demo-001", "as_of_seconds": 30, "evidence_ids": ["evt-0001"], "audience": "fan"}


class BrowserSessionTests(unittest.TestCase):
    def setUp(self):
        p = patch.dict(os.environ, {
            "MATCHWORK_BROWSER_SESSION_ENABLED": "true",
            "MATCHWORK_PUBLIC_ORIGIN": ORIGIN,
            "MATCHWORK_BROWSER_LOGIN_TOKEN": TOKEN,
            "MATCHWORK_SESSION_SIGNING_KEY": KEY,
            "MATCHWORK_MULTI_AGENT_ENABLED": "false",
        })
        p.start()
        self.addCleanup(p.stop)
        self.client = TestClient(app, base_url=ORIGIN)
        self.origin = {"Origin": ORIGIN}

    def test_anonymous_and_bad_origin_rejected(self):
        self.assertEqual(self.client.post("/api/browser/agents/insights", json=REQUEST, headers=self.origin).status_code, 401)
        self.assertEqual(self.client.post("/api/browser/session", json={"access_code": TOKEN}, headers={"Origin": "https://evil.test"}).status_code, 403)
        self.assertEqual(self.client.post("/api/browser/session", json={"access_code": "bad"}, headers=self.origin).status_code, 401)

    def test_cookie_csrf_and_logout(self):
        login = self.client.post("/api/browser/session", json={"access_code": TOKEN}, headers=self.origin)
        self.assertEqual(login.status_code, 200)
        self.assertIn("httponly", login.headers["set-cookie"].lower())
        self.assertIn("secure", login.headers["set-cookie"].lower())
        self.assertIn("samesite=strict", login.headers["set-cookie"].lower())
        csrf = login.json()["csrf_token"]
        self.assertEqual(self.client.post("/api/browser/agents/insights", json=REQUEST, headers=self.origin).status_code, 403)
        headers = {**self.origin, "X-Matchwork-CSRF": csrf}
        ok = self.client.post("/api/browser/agents/insights", json=REQUEST, headers=headers)
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["model_calls"], 0)
        self.assertEqual(self.client.post("/api/browser/agents/insights", json=REQUEST, headers={"Origin": "https://evil.test", "X-Matchwork-CSRF": csrf}).status_code, 403)
        self.assertEqual(self.client.post("/api/browser/logout", headers=headers).status_code, 200)
        self.assertEqual(self.client.post("/api/browser/agents/insights", json=REQUEST, headers=headers).status_code, 401)

    def test_disabled_by_default_fails_closed(self):
        with patch.dict(os.environ, {"MATCHWORK_BROWSER_SESSION_ENABLED": "false"}):
            self.assertEqual(self.client.post("/api/browser/session", json={"access_code": TOKEN}, headers=self.origin).status_code, 404)


if __name__ == "__main__":
    unittest.main()
