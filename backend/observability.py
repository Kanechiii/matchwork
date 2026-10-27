"""Opt-in, content-free Agent Framework and handoff telemetry.

Microsoft Agent Framework is hosted in our FastAPI app, not Foundry Hosted
Agents. Exporting spans to Azure Monitor requires explicit configuration and
optional dependencies. Do not record prompts, responses, tokens, or event IDs.
"""
from contextlib import contextmanager, nullcontext
import os


def tracing_enabled() -> bool:
    return os.getenv("MATCHWORK_TRACING_ENABLED", "false").strip().lower() in {
        "true", "1", "yes", "on",
    }


def configure_tracing() -> bool:
    """Initialize at process startup, only when explicitly enabled.

    Raises if enabled but exporter configuration/dependency is unavailable,
    rather than silently running without expected observability.
    """
    if not tracing_enabled():
        return False
    connection = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "").strip()
    if not connection:
        raise RuntimeError("Application Insights connection string required for tracing")

    from microsoft.opentelemetry import use_microsoft_opentelemetry

    use_microsoft_opentelemetry(
        enable_azure_monitor=True,
        azure_monitor_connection_string=connection,
        sampling_ratio=0.1,
        enable_sensitive_data=False,
        instrumentation_options={
            "agent-framework": {
                "enabled": True,
                "agent_name": "Matchwork Multi-Agent",
                "agent_id": "matchwork-multi-agent",
            }
        },
    )
    return True


@contextmanager
def handoff_span(name: str):
    """Only a static specialist role is recorded, never user evidence."""
    if not tracing_enabled():
        with nullcontext():
            yield
        return
    from opentelemetry import trace

    with trace.get_tracer("matchwork.agent_handoffs").start_as_current_span(
        "matchwork." + name
    ):
        yield
