# Phase 7 — Azure Container Apps release gates (not yet deployed)

This document is the **manual release procedure**, not evidence that production
security or deployment is finished. No secrets are stored in Git or frontend
assets. Use Azure Portal/CLI with an operator-approved change window.

## Security gate before public enablement

The current bearer credential is appropriate only for trusted backend-to-backend
or private CLI testing. It is **not** browser-safe: do not expose
`MATCHWORK_API_ACCESS_TOKEN` in Vite's `VITE_*`, JavaScript, Pages, or a
public API client. For a public interactive UI, implement server-owned sessions
with user authentication, authorization, CSRF protection where applicable,
and per-identity abuse controls; keep the paid endpoints disabled in the
public revision until that architecture is verified.

Do not mistake `FoundryBudget` for a spending cap. It is reset by application
restarts and multiplied across replicas. Set conservative Azure quotas, cost
alerts, and review model deployment caps. A true hard, shared request allowance
requires an atomic durable store (e.g. Redis with atomic operations, or a DB
transaction with a uniqueness constraint); this is **not yet implemented**.

## Required validation

1. `node scripts/exportReplay.mjs`
2. `python -m unittest discover -s backend/tests -p "test_*.py"`
3. `python -m backend.evaluate_agents`
4. `npm run build` and `npm run lint`
5. Verify all GitHub Actions jobs on PR #13 are green.
6. Verify no sensitive values or access tokens in Git, dist/, application logs,
   or public requests.
7. Privately verify unauthorized calls return HTTP 401, known replay IDs
   return HTTP 200 without inference when multi-agent disabled, fabricated and
   future IDs return HTTP 422, and unavailable ledger returns HTTP 503.
8. Validate one *operator-controlled* genuine Foundry call under preapproved
   Azure cost/quotas; evidence IDs and trace must match replay data.
9. Query Application Insights for real agent span names and status; distinguish
   simulated traces from genuine provider executions.

## Safe preview deployment

Keep `MATCHWORK_AI_ENABLED=false` and
`MATCHWORK_MULTI_AGENT_ENABLED=false` for public previews. Keep a healthy
previous revision for rollback. Ensure `APPLICATIONINSIGHTS_CONNECTION_STRING`
and `MATCHWORK_API_ACCESS_TOKEN` are supplied via Azure Container Apps
secrets and secret references, not Docker build args or image layers.
If telemetry is enabled, add optional telemetry dependencies to the image
first, and confirm tracing produces no sensitive payload attributes.
Do not use `MATCHWORK_TRACING_SAMPLE_RATIO=1` in production.

Example **inspection only**:

```powershell
az containerapp show --name matchwork-demo --resource-group rg-matchwork-hosting `
  --query "{fqdn:properties.configuration.ingress.fqdn,latest:properties.latestRevisionName}" --output json

az containerapp revision list --name matchwork-demo --resource-group rg-matchwork-hosting `
  --query "[].{name:name,active:properties.active,provisioning:properties.provisioningState,running:properties.runningState}" --output table
```

Explicit owner approval is required before pushing an image, merging PR #13,
changing Container Apps environment variables, or switching live traffic.

## Remaining engineering work

- An authenticated browser-safe application session or server-owned paid-call
  proxy, not a shared browser bearer token.
- Durable shared per-identity usage limits and a capped usage strategy.
- Staged Azure deployment with real request, observability and rollback QA.
