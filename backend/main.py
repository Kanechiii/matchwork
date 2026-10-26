from pathlib import Path
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAIError

from .foundry_service import explain_match_event


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
        default_factory=dict
    )


class InsightRequest(BaseModel):
    audience: Literal["fan", "analyst"] = "fan"
    event: MatchEvidence
    fallback_text: str = Field(
        min_length=1, max_length=1000
    )


class InsightResponse(BaseModel):
    source: Literal["foundry", "rule-based"]
    explanation: str
    evidence_ids: list[str]
    status: str


app = FastAPI(
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
    response_model=InsightResponse
)
async def generate_insight(
    request: InsightRequest
):
    evidence = request.event.model_dump()

    try:
        explanation = await explain_match_event(
            evidence,
            request.audience
        )

        return InsightResponse(
            source="foundry",
            explanation=explanation,
            evidence_ids=request.event.evidence_ids,
            status="success"
        )

    except (OpenAIError, RuntimeError):
        return InsightResponse(
            source="rule-based",
            explanation=request.fallback_text,
            evidence_ids=request.event.evidence_ids,
            status="ai_unavailable"
        )

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

