"""Offline diagnostics for the Microsoft Agent Framework / Foundry adapter.

Usage: python -m backend.diagnose_agents
No model requests are sent, no Azure credits are consumed, and no secret
values or endpoint URLs are printed.
"""
from __future__ import annotations

import asyncio
import sys

def main() -> int:
    stage = "load_configuration"
    transport = None
    try:
        # Importing existing backend configuration loads the local .env file.
        from . import foundry_service  # noqa: F401
        from .agent_framework_adapter import configured_endpoint
        base_url, api_key, deployment = configured_endpoint()
        print("CONFIGURATION: OK (Azure endpoint and deployment configured)")

        stage = "import_agent_framework"
        from agent_framework import Agent
        from agent_framework.openai import OpenAIChatClient
        from openai import AsyncOpenAI
        print("FRAMEWORK IMPORTS: OK")

        stage = "construct_transport"
        transport = AsyncOpenAI(
            base_url=base_url, api_key=api_key, timeout=10.0,
            max_retries=0,
        )
        print("FOUNDRY TRANSPORT: OK (not connected)")

        stage = "construct_agent"
        agent = Agent(
            client=OpenAIChatClient(
                model=deployment, async_client=transport,
            ),
            name="tactical_analyst",
            instructions="Check synthetic evidence",
            default_options={"max_tokens": 220, "store": False},
        )
        assert agent is not None
        print("AGENT CONSTRUCTION: OK (no inference requested)")
        print("MODEL CALLS: 0")
        return 0
    except Exception as exc:
        # No exception text, arguments, endpoint, or keys are emitted.
        print(f"DIAGNOSTIC FAILED: stage={stage} type={type(exc).__name__}", file=sys.stderr)
        return 1
    finally:
        if transport is not None:
            asyncio.run(transport.close())


if __name__ == "__main__":
    raise SystemExit(main())
