# Phase 7 — Foundry two-agent workflow (opt-in prototype)

The existing `POST /api/insights` remains unchanged. A new `POST /api/agents/insights` adds two **actual model-backed roles** and a deterministic evidence auditor on the FastAPI server. No React, ONNX, GitHub Pages or collaborator-owned files are edited.

## Architecture and scope

`Intake (Pydantic) → Tactical Analyst Agent (Foundry) → Narrative Agent (Foundry) → Evidence Auditor (local) → Response`

- **Tactical analyst:** inspects caller-provided synthetic event evidence, proposes a supported football observation and returns JSON with event citations.
- **Narrative agent:** receives the verified observation and citations (not an unrestricted match context), and creates a Fan- or Analyst-specific explanation.
- **Auditor:** checks citation IDs at **both** handoffs and restricts narrator IDs to the prior analyst IDs. Missing, malformed, or outside-scope citations fail closed to the caller's existing rule-based fallback.
- **Coordination:** ordered roles, bounded JSON handoffs, explicit role/status trace, per-model-call budget reservation, failure recovery.
- **Trust limitation:** citation IDs are validated against **caller-submitted IDs**, not cross-checked against a trusted server-side synthetic match ledger. The auditor cannot guarantee that prose facts are truthful. This is a hackathon prototype, not a production-approved content verifier.

## Cost and deployment safety

Default: `MATCHWORK_MULTI_AGENT_ENABLED=false`. This endpoint makes **zero paid Foundry calls** unless explicitly enabled. When enabled, a successful request makes **two** separately budgeted requests against the same `FoundryBudget` used by `/api/insights`. At the current default 20/hour and 50/day, at most 10 fully successful two-step workflows/hour or 25/day can occur if no single-agent requests consume allowance. These are **per-process limits, not actual Azure billing caps**; continue using Azure cost alerts and quotas. As always, never ship your Foundry API key into React bundles or log model credentials.

Example request (when a server running the branch is available):

```json
{
  "audience": "analyst",
  "event": {
    "minute": 78,
    "event_type": "shot",
    "team": "Northbridge",
    "description": "A shot was saved following completed passes",
    "score": "1 - 1",
    "evidence_ids": ["evt-0001", "evt-0002"],
    "statistics": {"shots": 3}
  },
  "fallback_text": "Observed synthetic events include three shots."
}
```

Returns `source` (`foundry` or `rule-based`), `explanation`, `status`, `evidence_ids`, `model_calls`, and four-stage `trace` on success. A failed specialist returns a shorter failure trace and safe rule-based fallback.

## Local verification

```bash
python -m unittest discover -s backend/tests -p 'test_*.py'
npm ci
npm run build
npm run lint
```

Mocks ensure **no Foundry costs in CI**. The tests check different roles, restricted handoffs, unsupported citations, first- and second-agent failures, retry budget accounting, and disabled mode.

## Next acceptance gates

1. Verify build, Python tests and PR CI.
2. With Azure credits/budget explicitly checked, enable `MATCHWORK_MULTI_AGENT_ENABLED=true` only for a controlled demo environment.
3. Send the same bounded synthetic event to Fan and Analyst audiences; verify actual Azure Foundry responses, the `source` field and citation handoff traces.
4. Add authentication/rate limits and trusted server-side synthetic event verification before public exposure. Current endpoint is opt-in, but **not a hardened public deployment**. Consider Azure Application Insights tracing and Microsoft Agent Framework integration for stronger managed orchestration; this implementation uses a custom Python orchestrator rather than the Agent Framework SDK.
5. Integrate an accessible UI behind separate approval, while protecting Issue #3 and #4 collaboration.

**Do not merge or deploy automatically.** Update Foundry/Azure deployment manually after review.
