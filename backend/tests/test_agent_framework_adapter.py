"""Contract tests for the Microsoft Agent Framework integration, no Azure calls."""
import asyncio
import os
import sys
import types
import unittest
from unittest.mock import patch

from backend.agent_framework_adapter import configured_endpoint, framework_model_call


class AdapterTests(unittest.IsolatedAsyncioTestCase):
    def test_requires_azure_https_endpoint(self):
        env = {
            "AZURE_OPENAI_BASE_URL": "https://demo.openai.azure.com/openai/v1/",
            "AZURE_OPENAI_API_KEY": "not-a-real-key",
            "AZURE_OPENAI_DEPLOYMENT": "model-deployment",
        }
        with patch.dict(os.environ, env):
            self.assertEqual(configured_endpoint()[2], "model-deployment")
            for invalid in [
                "http://demo.openai.azure.com/openai/v1/",
                "https://untrusted.example.com/openai/v1/",
                "https://demo.openai.azure.com/other",
                "https://demo.openai.azure.com.evil.org/openai/v1/",
            ]:
                with patch.dict(os.environ, {"AZURE_OPENAI_BASE_URL": invalid}):
                    with self.assertRaises(RuntimeError):
                        configured_endpoint()

    async def test_framework_agents_receive_separate_roles(self):
        calls = []
        class FakeClient:
            def __init__(self, **kwargs):
                calls.append(("client", kwargs))
        class FakeAgent:
            def __init__(self, **kwargs):
                calls.append(("agent", kwargs))
            async def run(self, prompt):
                calls.append(("run", prompt))
                return types.SimpleNamespace(text='{"finding":"synthetic","evidence_ids":["evt-1"]}')
        root = types.ModuleType("agent_framework")
        root.Agent = FakeAgent
        child = types.ModuleType("agent_framework.openai")
        child.OpenAIChatClient = FakeClient
        env = {
            "AZURE_OPENAI_BASE_URL": "https://demo.openai.azure.com/openai/v1/",
            "AZURE_OPENAI_API_KEY": "not-a-real-key",
            "AZURE_OPENAI_DEPLOYMENT": "model-deployment",
        }
        with patch.dict(os.environ, env), patch.dict(sys.modules, {
            "agent_framework": root,
            "agent_framework.openai": child,
        }):
            text = await framework_model_call("tactical_analyst", "Analyze", {"evidence_ids":["evt-1"]})
            self.assertIn('"finding"', text)
            self.assertEqual(calls[1][1]["name"], "tactical_analyst")
            self.assertIn("evt-1", calls[2][1])
            self.assertEqual(calls[0][1]["model"], "model-deployment")
            self.assertEqual(calls[0][1]["base_url"], env["AZURE_OPENAI_BASE_URL"])
            with self.assertRaises(ValueError):
                await framework_model_call("unauthorized", "x", {})


if __name__ == "__main__":
    unittest.main()
