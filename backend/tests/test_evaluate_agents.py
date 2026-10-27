import unittest
from backend.evaluate_agents import run, scenarios


class EvaluationTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_offline_scenarios_pass_without_foundry(self):
        report = await run()
        self.assertEqual(report["evaluation_type"], "offline_mocked_orchestration")
        self.assertEqual(report["provider_requests"], 0)
        self.assertEqual(report["case_count"], len(scenarios()))
        self.assertEqual(report["passed"], report["case_count"])
        self.assertEqual(report["pass_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
