# Phase 7E.2 — Shared inference attempt ledger

The Python-process `FoundryBudget` now requires an atomic shared Redis
reservation for every environment-configured paid model call. This is a
defense-in-depth call-attempt limiter, not a billing cap and not user-based
authorization. Existing direct unit tests can inject an in-memory budget.

**Fail-closed:** if `MATCHWORK_AI_ENABLED=true` but there is no configured
Redis ledger, all calls fall back with status `ai_budget_unavailable`.
`MATCHWORK_SHARED_BUDGET_ENABLED=true` and a valid TLS
`MATCHWORK_REDIS_URL=rediss://...` are required to enable reservations.
Redis credentials must be stored in Azure Container Apps secrets or Key
Vault, never in source or the frontend. TLS certificate validation must
remain enabled.

Each allowed specialist call atomically reserves an attempt using Redis
`EVAL`, counting both a fixed UTC hour and fixed UTC day. Scripts use a
single Redis Cluster hash slot to support multi-key atomicity. The Redis
server clock prevents client clock skew; TTLs expire at bucket boundaries.
Failed model calls still consume an attempt. Missing Redis, server errors,
or exhausted counters stop additional inference. Redis persistence and
durability must be provisioned according to the managed Redis service;
a total Redis data loss can reset counters. Concurrent in-flight calls
are limited per process, not globally. Shared hourly/daily counters are
global across staging replicas that share the prefix.

This implementation deliberately does NOT introduce Redis infrastructure
or deploy any new image to Azure. Both staging and production stay on
their existing images and settings, with paid inference disabled.
Before enabling paid traffic: provision persistent managed Redis with TLS,
set a dedicated restricted Redis credential in staging only, set a very
small global attempt limit, configure network access and persistence,
run a controlled test with the two-agent pipeline, and inspect Azure cost.
Prevent circumvention via direct Foundry credentials and other API clients.
For public access, add real user identities and durable per-identity rate
limits, and retain Azure budget alerts, model quotas, and kill switches.

The existing `MATCHWORK_API_ACCESS_TOKEN` protects the original
server-to-server endpoints, while the opt-in operator session remains OFF
by default. Neither is a multi-user authorization layer.
