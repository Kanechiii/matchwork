# Phase 7B — Protected paid API and trusted fixture

Both `POST /api/insights` and `POST /api/agents/insights` now require a
server-side configured bearer token. Empty or under-32-character tokens fail
closed (HTTP 503). Missing/wrong tokens receive HTTP 401 before budget
reservation or Foundry calls. `GET /health` remains public.

## Local setup

Run `node scripts/exportReplay.mjs` from the repository root before starting FastAPI. This exports the seeded 1,200-event authoritative ledger from the same TypeScript generator used by the UI. CI and Docker perform this automatically. Any generator changes require regeneration.

Use a random access token of at least 32 bytes. Do **not** place the token in
React, Vite public environment variables, frontend source, Pages artifacts,
screenshots, or the GitHub repo. Browser code cannot securely hold a shared
API bearer token. Use local curl/PowerShell or a backend-controlled identity
and session flow for any future public browser UI.

```powershell
$env:MATCHWORK_API_ACCESS_TOKEN = python -c "import secrets; print(secrets.token_urlsafe(48))"
$env:MATCHWORK_MULTI_AGENT_ENABLED = "false"
$env:MATCHWORK_AI_MAX_CALLS_PER_HOUR = "4"
$env:MATCHWORK_AI_MAX_CALLS_PER_DAY = "4"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

Second terminal (for same-shell token, store generated token securely and
set it there separately; never paste it into public UI):

```powershell
$headers = @{ Authorization = "Bearer $env:MATCHWORK_API_ACCESS_TOKEN" }
$body = @{
  match_id = "matchwork-demo-001"
  as_of_seconds = 30
  evidence_ids = @("evt-0001", "evt-0002")
  audience = "analyst"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8001/api/agents/insights `
  -Headers $headers -Method Post -ContentType "application/json" -Body $body
```

The new API **does not accept** the earlier `event` / `fallback_text`
payload. The backend selects canonical evidence and builds its own
rule-based fallback. An authenticated request with fabricated `evt-9999`,
a future timestamp, or an unknown match receives HTTP 422 before any
model invocation. Both paid endpoints require the same request format.

## Evidence boundary

`backend/trusted_evidence.py` now loads `backend/data/replay.json`, exported from the actual deterministic frontend generator (`seed=2026`, `eventCount=1200`). The backend recomputes the ledger SHA-256 and checks IDs and timestamps. The client supplies only the match, replay time and up to 10 evidence IDs; it never supplies an event description, score or statistics. Missing/invalid ledger returns HTTP 503; unknown/future evidence returns HTTP 422. The API derives its own descriptions and score as of the selected time.

`node scripts/exportReplay.mjs` must run whenever `src/engine/generateEvents.ts` or `src/data/demoMatch.ts` changes. Checksums detect accidental drift, not a malicious modification to the code/export together. This preserves the current fixed seeded demo, not arbitrary future match IDs or seeds.

## Production warning

The bearer check protects direct calls only as long as the access token is
confidential. Without per-user identity, durable rate limiting, network
restriction and a protected server-side UI proxy, this is **not** a
publicly usable browser-authentication design. Never embed the token in
JavaScript or distribute it to hackathon judges. Keep paid endpoints
disabled or internal until the final authenticated web architecture
is explicitly approved.

The existing FoundryBudget is per-process and is **not** an Azure billing
cap. Review Azure quotas and credit alerts before enabling paid calls.

Run: `python -m unittest discover -s backend/tests -p 'test_*.py'` and
`python -m backend.evaluate_agents`. CI installs the FastAPI dependencies
before executing the authenticated API tests.
