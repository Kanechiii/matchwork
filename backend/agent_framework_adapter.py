"""Microsoft Agent Framework adapter for Matchwork's existing Foundry endpoint.

Agent Framework owns the model-backed Agent instances and Responses calls.
Our bounded orchestrator in multi_agent.py validates the handoff between
agents and manages independent budget reservations.
"""
import asyncio
import json
import os
from urllib.parse import urlparse
from typing import Any


def configured_endpoint() -> tuple[str, str, str]:
    base_url = os.getenv("AZURE_OPENAI_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "").strip()
    endpoint = urlparse(base_url)
    # Keys must never be sent to an arbitrary domain from misconfigured env.
    hostname = (endpoint.hostname or "").lower()
    azure_host = (
        hostname.endswith(".openai.azure.com")
        or hostname.endswith(".services.ai.azure.com")
        or hostname.endswith(".cognitiveservices.azure.com")
    )
    if not (
        endpoint.scheme == "https"
        and azure_host
        and endpoint.path.rstrip("/") == "/openai/v1"
        and not endpoint.username
        and not endpoint.password
        and not endpoint.query
        and not endpoint.fragment
        and api_key
        and deployment
    ):
        raise RuntimeError("Azure OpenAI / Foundry connection is not configured safely")
    return base_url + "/", api_key, deployment


async def framework_model_call(
    role: str,
    instructions: str,
    payload: dict[str, Any],
) -> str:
    """Run one short-lived Microsoft Agent Framework agent, no shared history."""
    if role not in {"tactical_analyst", "narrative_agent"}:
        raise ValueError("Unsupported agent role")
    base_url, api_key, deployment = configured_endpoint()
    # Import lazily so disabled workflows and deterministic CI tests do not
    # require initializing an external client or consuming Azure credentials.
    from agent_framework import Agent
    from agent_framework.openai import OpenAIChatClient

    agent = Agent(
        client=OpenAIChatClient(
            model=deployment,
            base_url=base_url,
            api_key=api_key,
            timeout=10.0,
        ),
        name=role,
        instructions=instructions,
        default_options={"max_tokens": 220, "store": False},
    )
    prompt = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    # This is a bounded per-agent request, not an autonomous loop or a tool
    # execution surface. Output is separately validated by the orchestrator.
    response = await asyncio.wait_for(agent.run(prompt), timeout=12.0)
    result = getattr(response, "text", None)
    if not isinstance(result, str) or not result.strip():
        raise RuntimeError("Agent Framework returned an empty response")
    return result.strip()
