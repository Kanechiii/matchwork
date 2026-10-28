import json
from pathlib import Path
import os
from hashlib import sha256
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, Depends, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from openai import OpenAIError

from .ai_budget import foundry_budget
from .foundry_service import explain_match_event
from .multi_agent import orchestrate_foundry_insight
from .observability import configure_tracing
from .auth import require_ai_access
from .operator_session import OperatorLogin, start_operator_session, end_operator_session, require_operator_session
from .trusted_evidence import resolve_evidence, load_replay, MATCH_ID
from .shared_budget import SharedAttemptLedger


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



class PublicPreviewRequest(BaseModel):
    """No submitted event descriptions or arbitrary IDs are trusted."""
    match_id: Literal["matchwork-demo-001"]
    as_of_seconds: int = Field(ge=0, le=5400)
    audience: Literal["fan", "analyst"] = "fan"


def _public_fallback(evidence: dict[str, Any], fallback: str, status: str) -> MultiAgentResponse:
    return MultiAgentResponse(
        source="rule-based", explanation=fallback, evidence_ids=evidence["evidence_ids"],
        status=status, model_calls=0, trace=[],
    )


def _positive_limit(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, str(default))))
    except ValueError:
        return 0


@app.post("/api/public/agents/insights", response_model=MultiAgentResponse)
async def public_agent_preview(payload: PublicPreviewRequest, request: Request, response: Response):
    """Opt-in anonymous demo with verified canonical events and a Redis request budget.

    Public calls are NOT unlimited: shared budget still reserves each actual
    specialist call. The additional public quota is independent and fails closed.
    Successful citations are cached across replicas to avoid repeat charges.
    """
    response.headers["Cache-Control"] = "no-store"
    # A cross-site browser cannot submit JSON here. Origin is supplemental
    # browser protection, not authentication: quotas enforce cost limits.
    origin = os.getenv("MATCHWORK_PUBLIC_ORIGIN", "").rstrip("/")
    if not origin.startswith("https://") or request.headers.get("origin") != origin:
        raise HTTPException(status_code=403, detail="Origin rejected")

    # Load only the known, checksummed server ledger. Client never selects IDs.
    entries = load_replay()["events"]
    ids = [
        event["id"] for event in entries
        if event["elapsedSeconds"] <= payload.as_of_seconds
    ][-5:]
    evidence = resolve_evidence(payload.match_id, payload.as_of_seconds, ids)
    fallback = "Observed synthetic replay: " + evidence["description"] + "."
    if os.getenv("MATCHWORK_PUBLIC_AI_ENABLED", "false").lower() not in ("1", "true"):
        return _public_fallback(evidence, fallback, "public_preview_disabled")
    if os.getenv("MATCHWORK_SHARED_BUDGET_ENABLED", "false").lower() not in ("1", "true"):
        return _public_fallback(evidence, fallback, "ai_budget_unavailable")
    ledger = foundry_budget._shared_ledger
    if not isinstance(ledger, SharedAttemptLedger):
        return _public_fallback(evidence, fallback, "ai_budget_unavailable")

    # Cache keys contain no user input beyond the constrained clock and audience.
    # The canonical ledger digest invalidates caches if the event data changes.
    digest = load_replay()["events_sha256"][:16]
    cache_id = sha256(
        f"{digest}:{payload.match_id}:{payload.as_of_seconds}:{payload.audience}".encode()
    ).hexdigest()
    cache_key = f"matchwork:public-ai:{{foundry}}:cache:{cache_id}"
    lock_key = f"matchwork:public-ai:{{foundry}}:lock:{cache_id}"
    client = ledger.client
    try:
        cached = client.get(cache_key)
        if cached:
            result = json.loads(cached)
            if result.get("source") == "foundry" and result.get("status") == "success":
                return MultiAgentResponse(**result)
        # One execution across concurrent replicas. A 45-second TTL prevents
        # a stuck execution from blocking this sample forever.
        if not client.set(lock_key, "1", nx=True, ex=45):
            return _public_fallback(evidence, fallback, "ai_busy")
    except Exception:
        return _public_fallback(evidence, fallback, "ai_budget_unavailable")

    # The public limiter bounds *requests*; the existing global shared limiter
    # additionally counts each of the two specialist model attempts.
    quota = SharedAttemptLedger(client, prefix="matchwork:public-ai")
    refusal = quota.reserve(
        _positive_limit("MATCHWORK_PUBLIC_AI_MAX_CALLS_PER_HOUR", 4),
        _positive_limit("MATCHWORK_PUBLIC_AI_MAX_CALLS_PER_DAY", 10),
    )
    if refusal:
        return _public_fallback(evidence, fallback, refusal)

    result = await orchestrate_foundry_insight(evidence, payload.audience, fallback)
    if result["source"] == "foundry":
        try:
            client.set(cache_key, json.dumps(result, ensure_ascii=False), ex=86400 * 21)
        except Exception:
            # The response remains valid, but a failed cache must not bypass
            # subsequent shared budget reservations.
            pass
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

