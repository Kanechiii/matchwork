# Phase 7 — Foundry evaluation and optional Azure Monitor tracing

This stage adds measurable **offline agent-coordination tests** and optional
**Azure Application Insights OpenTelemetry spans** to PR #13. It does NOT
automatically turn on cloud evaluation or record prompts.

## What is measured now (no Foundry billing)

```powershell
python -m backend.evaluate_agents
python -m unittest discover -s backend/tests -p "test_*.py"
```

The runner uses simulated agents and returns a JSON case table, count and pass
rate for successful Fan/Analyst handoffs, missing/invalid evidence IDs,
unsupported narrator citations, provider outage, disabled model use and
one-call budget exhaustion. Its `evaluation_type` is
`offline_mocked_orchestration`. **This is not an accuracy, groundedness,
relevance, or Foundry evaluation result.** A 100% mocked test pass rate does
not imply the real model is always factual.

## Real Foundry quality evaluation (manual, limited budget)

1. Work only with synthetic event fixtures; do not use Premier League licensed
   feeds or real-match footage.
2. In Microsoft Foundry's evaluation interface, create an evaluation dataset
   with input evidence, audience, expected grounded facts, permitted IDs,
   and actual `/api/agents/insights` output. Start with no more than two
   successful calls (up to four model attempts) if your Azure budget allows.
3. Check factual groundedness, relevance, instruction adherence, citation
   membership, and Fan/Analyst differentiation. An evaluator's model calls
   may incur **additional charges** beyond Matchwork's in-process budget.
4. Download or screenshot actual evaluation results for submission evidence.
   Report evaluator name/version, data size, failure examples and measured
   scores. **No such results are generated or claimed by the repo scripts.**
5. Never commit evaluator credentials or raw model-generated content without
   reviewing data exposure risks. Do not use fabricated placeholder metrics.

## Optional Azure Monitor trace export (opt in)

By default, `MATCHWORK_TRACING_ENABLED=false`. Set it to `true` only
on a trusted developer instance **after checking the Azure Monitor cost**.
The implementation exports 10% sampled OpenTelemetry traces from each
specialist role and does not attach prompt text, full responses, match
event details or credentials as span attributes.

Install optional Python packages:

```powershell
python -m pip install -r backend/requirements-observability.txt
```

With an existing Application Insights resource and a connection string kept
private, run this in the PowerShell terminal hosting your local API:

```powershell
$env:MATCHWORK_TRACING_ENABLED = "true"
$env:APPLICATIONINSIGHTS_CONNECTION_STRING = "<from your Application Insights resource>"
# Keep MATCHWORK_MULTI_AGENT_ENABLED and call limits conservative.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

**Security note:** the connection string must not be committed to GitHub or
displayed in test output; remove the variable or set tracing to false after
testing. On production Azure Container Apps, use a secret-backed environment
variable and independently protect the API before exposing it.

Open Application Insights transaction traces or the Foundry observability
experience connected to the resource and search for
`matchwork.tactical_analyst` and `matchwork.narrative_agent`.
A single short test request may produce **no spans** at 10% sampling.
Do not increase instrumentation or enable sensitive payload capture merely
to obtain a screenshot. Sampling and export timing affect visibility.

This code currently emits custom OpenTelemetry handoff spans. It is **not**
a complete Framework-managed agent trace with conversation bodies, token
usage, or model-level traces. It also does not automatically bind the
Application Insights resource to the Foundry project. Configure the
appropriate association through Azure/Foundry if available in your project.

## Remaining release gates

- Verify the real Foundry evaluator output and capture measurements.
- Demonstrate at least one trace from the running deployed service.
- Bind evidence IDs to authoritative server-side synthetic match events;
  caller-supplied IDs alone cannot establish factual truth.
- Authenticate/protect the paid endpoint before public use.
- Integrate the new endpoint with the dashboard in an approved UI PR.
- Explicitly review, merge, and deploy PR #13; no automation here performs
  an Azure deployment.
