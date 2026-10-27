# Matchwork — Foundry Cost Controls and Shared Attempt Budget

## Purpose

Explain the defense-in-depth controls for paid Microsoft Foundry requests, including the verified Azure Managed Redis shared attempt ledger.

## Current Status

The secure `matchwork-secure-demo` revision 0000005 was verified running with `MATCHWORK_SHARED_BUDGET_ENABLED=true` and `MATCHWORK_REDIS_URL` referencing a Container Apps secret. An authenticated `SharedAttemptLedger.reserve(100,1000)` call succeeded. These facts verify connectivity and atomic reservation; they do not guarantee that all billable Foundry activity is limited to this app.

## Controls

| Setting | Function |
| --- | --- |
| `MATCHWORK_AI_ENABLED` | Disable all configured paid AI paths when set to `false` |
| `MATCHWORK_AI_MAX_CALLS_PER_HOUR` | Hourly model-attempt allowance |
| `MATCHWORK_AI_MAX_CALLS_PER_DAY` | UTC daily model-attempt allowance |
| `MATCHWORK_SHARED_BUDGET_ENABLED` | Opt-in Redis-backed shared reservations |
| `MATCHWORK_REDIS_URL` | TLS Redis URL, stored as Container Apps secret reference |
| `MATCHWORK_API_ACCESS_TOKEN` | Server-only bearer token for protected model endpoints |

The shared ledger uses Redis server time, atomic Lua `EVAL`, a single Cluster hash slot and fixed UTC time buckets. Failed model calls consume a reserved attempt. With the shared budget enabled but unavailable, the app fails closed into fallback and can report `ai_budget_unavailable`. Per-process concurrency protection still applies.

## Safety Caveats

A request-attempt budget is **not a hard billing cap**: direct model calls from other credentials or services, Redis data loss, misconfiguration, and changes in model pricing remain separate risks. Azure spending alerts and model TPM allocation are monitoring and throttling tools, **not** automatic financial cutoffs. Keep least-privilege credentials, protected endpoints, conservative quota and a reversible kill switch.

## Verification

```powershell
az containerapp show --name matchwork-secure-demo --resource-group rg-matchwork-hosting --query "properties.template.containers[0].env[?name=='MATCHWORK_SHARED_BUDGET_ENABLED' || name=='MATCHWORK_REDIS_URL'].{Name:name,Value:value,SecretRef:secretRef}" --output table
python -m unittest backend.tests.test_shared_budget -v
```

The test suite uses mocked Redis behavior. The authenticated Azure reservation was separately verified inside the running container. Do not put the Redis access key in source, logs or README snippets.

## Operational Checklist

- [x] Atomic Redis Lua reservation tested successfully in secure Container Apps
- [x] Cluster hostname remapping preserved TLS certificate verification
- [x] Secret reference used instead of plaintext Redis URL in app configuration
- [ ] Confirm paid requests use the ledger in an end-to-end Foundry-source test
- [ ] Periodically review Azure budget, Foundry consumption and environment configuration
- [ ] Establish per-user identity and quota controls before broad public paid access

## Related Documents

[Deployment snapshot](docs/DEPLOYMENT_CURRENT.md) · [Shared budget design](docs/PHASE7E_SHARED_BUDGET.md) · [API security](docs/PHASE7B_API_SECURITY.md)
