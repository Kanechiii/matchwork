# Phase 7 — Azure for Students Foundry cost protection

The public `POST /api/insights` endpoint can invoke billable Microsoft Foundry inference. Matchwork now provides a **best-effort, per-process** limit that returns existing rule-based fallback explanations instead of calling Foundry after the configured allowance.

| Variable | Default | Meaning |
| --- | --- | --- |
| `MATCHWORK_AI_ENABLED` | `true` | Set to `false` to disable all paid Foundry attempts |
| `MATCHWORK_AI_MAX_CALLS_PER_HOUR` | `20` | Max Foundry attempts per rolling hour per process |
| `MATCHWORK_AI_MAX_CALLS_PER_DAY` | `50` | Max Foundry attempts per UTC calendar day per process |

The per-process concurrency limit is one. Rejected requests do not call Foundry. Failed attempts still count toward the allowance. Fallback responses include statuses such as `ai_disabled`, `ai_hourly_limited`, `ai_daily_limited`, and `ai_busy`.

**Not a hard spending limit:** cold starts, worker restarts, new revisions, multiple replicas, and separate processes can reset or duplicate counters. This is a demonstration safeguard, not an Azure subscription-wide budget. For strong guarantees, require authentication and atomic durable accounting, and/or keep Foundry disabled.

## Deploy configuration in Azure Cloud Shell Bash

After publishing a new GitHub Container Registry image and updating `matchwork-demo` to that image:

```bash
az containerapp update \
  --name matchwork-demo \
  --resource-group rg-matchwork-hosting \
  --set-env-vars \
  MATCHWORK_AI_ENABLED=true \
  MATCHWORK_AI_MAX_CALLS_PER_HOUR=12 \
  MATCHWORK_AI_MAX_CALLS_PER_DAY=30
```

Emergency disable (rule-based mode remains available):

```bash
az containerapp update \
  --name matchwork-demo \
  --resource-group rg-matchwork-hosting \
  --set-env-vars MATCHWORK_AI_ENABLED=false
```

Repeat with `MATCHWORK_AI_ENABLED=true` to re-enable after testing.

Keep deployment token-per-minute (TPM) quota conservative, configure Azure Cost Management budget alerts, and use one Container Apps replica. **TPM quota and budget notifications are not hard spending ceilings.**

Do not use `az acr build` or `az containerapp up --source .` with the Azure for Students subscription where ACR Tasks is unavailable. Publish through the existing GitHub Actions GHCR workflow, then update the Container App by image.

## Test locally / in CI

```bash
python3 -m unittest discover -s backend/tests -p 'test_*.py'
```
