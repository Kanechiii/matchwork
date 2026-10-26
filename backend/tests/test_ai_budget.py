import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from backend.ai_budget import FoundryBudget


class SimulatedTime:
    def __init__(self):
        self.seconds = 0.0
        self.when = datetime(2026, 10, 27, tzinfo=timezone.utc)

    def clock(self):
        return self.seconds

    def utcnow(self):
        return self.when

    def advance(self, seconds):
        self.seconds += seconds
        self.when += timedelta(seconds=seconds)


class FoundryBudgetTests(unittest.TestCase):
    def setUp(self):
        self.time = SimulatedTime()
        self.guard = FoundryBudget(
            hourly_limit=2,
            daily_limit=3,
            concurrent_limit=1,
            clock=self.time.clock,
            utcnow=self.time.utcnow,
        )

    def test_hourly_limit_returns_fallback_and_recovers(self):
        for _ in range(2):
            self.assertIsNone(self.guard.acquire())
            self.guard.release()
        self.assertEqual(self.guard.acquire(), "ai_hourly_limited")
        self.time.advance(3600)
        self.assertIsNone(self.guard.acquire())
        self.guard.release()

    def test_daily_limit_resets_utc(self):
        for _ in range(2):
            self.assertIsNone(self.guard.acquire())
            self.guard.release()
        self.time.advance(3600)
        self.assertIsNone(self.guard.acquire())
        self.guard.release()
        self.assertEqual(self.guard.acquire(), "ai_daily_limited")
        self.time.advance(24 * 3600)
        self.assertIsNone(self.guard.acquire())
        self.guard.release()

    def test_concurrent_limit_preserves_attempts(self):
        self.assertIsNone(self.guard.acquire())
        self.assertEqual(self.guard.acquire(), "ai_busy")
        self.guard.release()
        self.assertIsNone(self.guard.acquire())
        self.guard.release()

    def test_disabled_never_allows_paid_calls(self):
        disabled = FoundryBudget(enabled=False)
        self.assertEqual(disabled.acquire(), "ai_disabled")

    def test_invalid_environment_limit_fails_closed(self):
        with patch.dict(os.environ, {
            "MATCHWORK_AI_ENABLED": "true",
            "MATCHWORK_AI_MAX_CALLS_PER_HOUR": "unlimited",
            "MATCHWORK_AI_MAX_CALLS_PER_DAY": "50",
        }):
            budget = FoundryBudget.from_environment()
        self.assertEqual(budget.acquire(), "ai_hourly_limited")

    def test_zero_limit_disables_calls(self):
        guard = FoundryBudget(hourly_limit=0)
        self.assertEqual(guard.acquire(), "ai_hourly_limited")


if __name__ == "__main__":
    unittest.main()
