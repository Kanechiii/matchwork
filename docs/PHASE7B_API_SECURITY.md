# Phase 7B — Protected paid API and trusted fixture

Both `POST /api/insights` and `POST /api/agents/insights` now require a
server-side configured bearer token. Empty or under-32-character tokens fail
closed (HTTP 503). Missing/wrong tokens receive HTTP 401 before budget
reservation or Foundry calls. `GET /health` remains public.

## Local setup

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
  match_id = "matchwork-curated-security-fixture-v1"
  as_of_seconds = 4680
  evidence_ids = @("safe-pass-001", "safe-shot-001")
  audience = "analyst"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8001/api/agents/insights `
  -Headers $headers -Method Post -ContentType "application/json" -Body $body
```

The new API **does not accept** the earlier `event` / `fallback_text`
payload. The backend selects canonical evidence and builds its own
rule-based fallback. An authenticated request with fabricated `evt-0001`,
a future timestamp, or an unknown match receives HTTP 422 before any
model invocation. Both paid endpoints require the same request format.

## Evidence boundary

`backend/trusted_evidence.py` contains a **small curated server-controlled
synthetic fixture**, with `safe-shot-001`, `safe-pass-001`, and
`safe-pressure-001`. It is **not the seeded JavaScript replay dataset**.
This is a backend protection prototype and cannot yet drive verified
replay-clock insights for arbitrary UI events. Full canonical evidence
integration requires generating/exporting the real synthetic event stream
and verifying its consistency; avoid claiming that work is done.

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
