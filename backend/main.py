import json
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from openai import OpenAIError

from .ai_budget import foundry_budget
from .foundry_service import explain_match_event
from .multi_agent import orchestrate_foundry_insight
from .observability import configure_tracing
from .auth import require_ai_access
from .operator_session import OperatorLogin, start_operator_session, end_operator_session, require_operator_session
from .trusted_evidence import resolve_evidence, MATCH_ID


class MatchEvidence(BaseModel):
    minute: float = Field(ge=0, le=130)
    event_type: str = Field(
        min_length=1, max_length=80
    )
    team: str = Field(
        min_length=1, max_length=100
    )
    description: str = Field(
        min_length=1, max_length=1000
    )
    score: str = Field(
        min_length=3, max_length=30
    )
    evidence_ids: list[str] = Field(
        default_factory=list,
        max_length=30
    )
    statistics: dict[str, Any] = Field(
        default_factory=dict,
        max_length=25
    )

    @field_validator("evidence_ids")
    @classmethod
    def limit_evidence_id_size(cls, values: list[str]) -> list[str]:
        if any(len(value) > 100 for value in values):
            raise ValueError("Evidence IDs must be at most 100 characters")
        return values

    @field_validator("statistics")
    @classmethod
    def limit_statistics_size(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(value, ensure_ascii=False).encode("utf-8")) > 2048:
            raise ValueError("Statistics must be at most 2048 bytes")
        return value


class InsightRequest(BaseModel):
    audience: Literal["fan", "analyst"] = "fan"
    event: MatchEvidence
    fallback_text: str = Field(
        min_length=1, max_length=1000
    )


class TrustedInsightRequest(BaseModel):
    match_id: Literal["matchwork-demo-001"]
    as_of_seconds: int = Field(ge=0, le=5400)
    evidence_ids: list[str] = Field(min_length=1, max_length=10)
    audience: Literal["fan", "analyst"] = "fan"


def verified_request(request: TrustedInsightRequest) -> tuple[dict[str, Any], str]:
    evidence = resolve_evidence(
        request.match_id, request.as_of_seconds, request.evidence_ids
    )
    fallback = (
        "Observed synthetic replay: " + evidence["description"] + "."
    )
    return evidence, fallback


class InsightResponse(BaseModel):
    source: Literal["foundry", "rule-based"]
    explanation: str
    evidence_ids: list[str]
    status: str


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_tracing()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Matchwork Intelligence API",
    version="0.1.0"
)

# Local development only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "matchwork-api"
    }


@app.post(
    "/api/insights",
    response_model=InsightResponse,
    dependencies=[Depends(require_ai_access)],
)
async def generate_insight(
    request: TrustedInsightRequest
):
    evidence, fallback = verified_request(request)
    fallback_status = foundry_budget.acquire()
    if fallback_status is not None:
        return InsightResponse(
            source="rule-based",
            explanation=fallback,
            evidence_ids=evidence["evidence_ids"],
            status=fallback_status
        )

    try:
        explanation = await explain_match_event(
            evidence,
            request.audience
        )

        return InsightResponse(
            source="foundry",
            explanation=explanation,
            evidence_ids=evidence["evidence_ids"],
            status="success"
        )

    except (OpenAIError, RuntimeError, KeyError):
        return InsightResponse(
            source="rule-based",
            explanation=fallback,
            evidence_ids=evidence["evidence_ids"],
            status="ai_unavailable"
        )
    finally:
        foundry_budget.release()


class MultiAgentResponse(InsightResponse):
    model_calls: int
    trace: list[dict[str, str]]


@app.post("/api/agents/insights", response_model=MultiAgentResponse, dependencies=[Depends(require_ai_access)])
async def generate_multi_agent_insight(request: TrustedInsightRequest):
    """Opt-in, budgeted two-specialist Foundry workflow with safe fallback."""
    evidence, fallback = verified_request(request)
    result = await orchestrate_foundry_insight(
        evidence,
        request.audience,
        fallback,
    )
    return MultiAgentResponse(**result)

@app.post("/api/browser/session")
async def browser_session_login(request: Request, response: Response, login: OperatorLogin):
    return start_operator_session(request, response, login)


@app.post("/api/browser/logout", dependencies=[Depends(require_operator_session)])
async def browser_session_logout(response: Response):
    return end_operator_session(response)


@app.post(
    "/api/browser/agents/insights",
    response_model=MultiAgentResponse,
    dependencies=[Depends(require_operator_session)],
)
async def browser_agent_insight(request: TrustedInsightRequest):
    """Optional authenticated operator browser route; no bearer secret in JS."""
    evidence, fallback = verified_request(request)
    result = await orchestrate_foundry_insight(evidence, request.audience, fallback)
    return MultiAgentResponse(**result)


# Serve the production React application.
FRONTEND_DIR = (
    Path(__file__).resolve().parent.parent / "dist"
)

if FRONTEND_DIR.is_dir():
    app.mount(
        "/",
        StaticFiles(
            directory=str(FRONTEND_DIR),
            html=True
        ),
        name="frontend"
    )

