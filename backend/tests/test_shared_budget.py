import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Lock
from unittest.mock import patch

from backend.ai_budget import FoundryBudget
from backend.shared_budget import SharedAttemptLedger, from_environment


class AtomicRedisDouble:
    """Test-only implementation of Redis TIME/EVAL atomic semantics."""
    def __init__(self):
        self.data = {}
        self.lock = Lock()
        self.now = int(datetime(2026, 10, 27, tzinfo=timezone.utc).timestamp())
        self.error = False

    def time(self):
        if self.error:
            raise ConnectionError("Redis unavailable")
        return self.now, 0

    def eval(self, script, count, hour_key, day_key, hour_limit, day_limit, hour_end, day_end):
        with self.lock:
            if self.error:
                raise ConnectionError("Redis unavailable")
            h = self.data.get(hour_key, 0)
            d = self.data.get(day_key, 0)
            if h >= hour_limit:
                return 1
            if d >= day_limit:
                return 2
            self.data[hour_key] = h + 1
            self.data[day_key] = d + 1
            return 0


class SharedBudgetTests(unittest.TestCase):
    def test_atomic_reservations_shared_across_instances(self):
        client = AtomicRedisDouble()
        a = SharedAttemptLedger(client)
        b = SharedAttemptLedger(client)
        with ThreadPoolExecutor(max_workers=12) as pool:
            values = list(pool.map(lambda n: (a if n % 2 else b).reserve(5, 10), range(30)))
        self.assertEqual(values.count(None), 5)
        self.assertEqual(values.count("ai_hourly_limited"), 25)

    def test_hour_and_day_boundaries(self):
        client = AtomicRedisDouble()
        budget = SharedAttemptLedger(client)
        self.assertIsNone(budget.reserve(1, 2))
        self.assertEqual(budget.reserve(1, 2), "ai_hourly_limited")
        client.now += 3600
        self.assertIsNone(budget.reserve(1, 2))
        self.assertEqual(budget.reserve(1, 2), "ai_hourly_limited")
        client.now += 3600
        self.assertEqual(budget.reserve(1, 2), "ai_daily_limited")

    def test_outage_and_no_configuration_fail_closed(self):
        client = AtomicRedisDouble()
        ledger = SharedAttemptLedger(client)
        client.error = True
        self.assertEqual(ledger.reserve(10, 10), "ai_budget_unavailable")
        with patch.dict("os.environ", {"MATCHWORK_SHARED_BUDGET_ENABLED": "true", "MATCHWORK_REDIS_URL": "redis://localhost:6379"}):
            self.assertEqual(from_environment().reserve(10, 10), "ai_budget_unavailable")

    def test_process_budget_rejects_shared_unavailable_before_attempt(self):
        client = AtomicRedisDouble()
        client.error = True
        budget = FoundryBudget(shared_ledger=SharedAttemptLedger(client))
        self.assertEqual(budget.acquire(), "ai_budget_unavailable")
        self.assertEqual(budget._day_attempts, 0)

    def test_two_specialist_reservations(self):
        budget = FoundryBudget(hourly_limit=2, daily_limit=2, shared_ledger=SharedAttemptLedger(AtomicRedisDouble()))
        self.assertIsNone(budget.acquire())
        budget.release()
        self.assertIsNone(budget.acquire())
        budget.release()
        self.assertEqual(budget.acquire(), "ai_hourly_limited")


if __name__ == "__main__":
    unittest.main()
