# Matchwork — Enterprise Readiness and Assurance

**Scope:** Public static prototype built for the Microsoft × Premier League Inside the Game Developer Hackathon 2026. This document establishes measurable evidence and a *path* to enterprise adoption; it is not a production certification.  
**Baseline:** Main commit `7df00110cab370e2c4e1b9557748a7cf553ac44b`.  
**Owner:** Project lead; collaborator assignments #3 (UI) and #4 (AI evidence/ONNX) remain independent.

## Executive assessment

Matchwork is an illustrative public, browser-hosted, synthetic football intelligence application. Its strengths are event-source determinism, replay/statistic reconciliation, explicit AI unavailability states, reproducible ONNX model construction, accessible-to-judges static hosting and automated checks. **It is not yet a multi-tenant, authenticated, production broadcast platform.** No server-side business secrets or real match feeds are required for the current demo.

Official award category: **Best Enterprise Solution**, judged on enterprise readiness, long-term business impact, reliability, transparency and controls. These criteria are an aspiration; our tests are evidence, not proof of actual enterprise adoption.

## Deployment, data and trust boundaries

```text
Original fictional match metadata
  -> deterministic 900–1400 event generator (browser)
  -> statistic/replay engine (browser)
  -> rolling 3-minute features (browser)
  -> Microsoft ONNX Runtime Web WASM (external pinned jsDelivr CDN)
  -> model scores (illustrative synthetic prototypes)
  -> deterministic templates / evidence IDs -> Fan / Analyst UI
          |
   GitHub Pages: versioned static HTML, JS and CSS
   GitHub Actions: build + checks / manually dispatched publish
```

- Data classification: **public/synthetic**; fictional teams, players and events. There is no user account system, no customer database and no intended PII collection by application code. Hosting/CDN operators may log ordinary web requests under their own policies; **do not claim zero external data collection**.
- Public assets and client-executed code are observable by all visitors. Never embed API tokens, tenant keys, secrets or private datasets in frontend bundles.
- CDN boundary: inference dynamically loads version-pinned `onnxruntime-web@1.23.2` from jsDelivr. A version pin is **not** an integrity hash, supply-chain attestation or guaranteed uptime. Inference currently requires working external CDN access.
- Machine-learning boundary: the embedded model is trained on handcrafted synthetic prototypes; output scores are **not** calibrated real-world match probabilities. Narrative recaps are deterministic event templates, **not LLM-generated**.
- Privilege boundary: Quality CI has `contents: read`. Manual Pages deployment is main-only, with `pages: write` and `id-token: write` scoped to the deployment job. Actual GitHub repository rules and environment protection must be verified in Settings.

## Controls and measurable evidence

| Control | Test / artifact | What it proves | Limitation |
| --- | --- | --- | --- |
| Deterministic simulation | `verifyGenerator`, `verifyIntegration`, `verifyEnterprise` | Repeated seeds reproduce identical event sequences | Not equivalent to authentic match realism |
| As-of / no-future integrity | `verifyEnterprise`, `verifyIntelligence` | Selected statistics/features/recaps use only events at/before specified replay clocks | Browser race behavior remains #4 scope |
| Statistics coherence | `verifyStats`, `verifyReplay`, `verifyEnterprise` | Event-based totals and replay snapshots reconcile | Possession is an estimate from synthetic transitions |
| Invalid data rejection | `verifyEnterprise` | Demonstrated failures on duplicate IDs, impossible clocks and generator options | No validation schema for arbitrary untrusted event imports |
| Model inference | `verifyOnnxRuntime` and rebuilt model check | Actual WASM inference and reproducible embedded model | Not a verified forecast or third-party dependency audit |
| Static publication | `verifyPagesBuild`, `verifyEnterprise` | Repository-relative referenced assets exist in production build | Not a substitute for live browser/HTTP monitoring |
| Release security scan | `verifyEnterprise` | Detects selected private-key markers and common API credential prefixes in bundled JS/CSS | Narrow pattern checks; **not a complete secret scanner** |
| Quality CI | `.github/workflows/quality.yml` | Automated checks must pass on proposed PRs | Public GitHub repository does not currently imply protected main |
| Reproducible operations | `npm ci`, pinned Node release, manual deploy action | Deterministic lockfile install path and deliberate publication | CDN outages and upstream runner changes can still occur |

## Threat model / risks and required mitigations

| Risk | Likelihood / impact | Current safeguard | Next production step |
| --- | --- | --- | --- |
| Misleading AI outputs | Medium / high | Explicit synthetic-model caveat; evidence-linked templates | Independently curated benchmark suite and human editorial review |
| Inference CDN unavailable | Medium / medium | Honest unavailable state while non-AI statistics remain | Package local version-locked WASM bundle, service health measurements; coordinate with #4 |
| Stale inference after rapid seek | Medium / medium | Effect cleanup and bucketed inference | Race regression tests and per-prediction as-of metadata; #4 owner |
| Injection in external football feed | Low for current demo / high for integrations | Only local generated events | Schema validation, event signing, timestamps, idempotency, rate limits |
| Exposed credentials or PII | Low for current demo / high for enterprise | No secrets needed in client | Vault-backed backend, scoped identity, privacy impact review |
| Compromised GitHub dependency or workflow | Medium / high | npm lockfile, limited workflow permissions | Dependency review, automated advisories and immutable action SHA pinning |
| Unauthorized publishing | Medium / medium | Manual-only workflow with main branch guard | Protected branches, reviewed PRs and GitHub environment approval |
| Inaccessible demo | Medium / medium | Static-hosted public Pages | Availability checks, documented escalation and alternate artifact |
| Data/license misuse | Medium / high | Synthetic inputs and original UI | Contributor IP agreement, complete dependency/asset license inventory |

## Operational objectives (proposal; NOT yet measured SLOs)

- **Public demo availability objective:** 99% during hackathon judging; verify with external HTTP checks after deployment. No uptime monitor currently runs.
- **Replay/stat correctness objective:** 100% on deterministic acceptance fixtures in CI.
- **Inference failure behavior:** Never present a fabricated successful model inference when ONNX is unavailable.
- **Performance objective:** 95th-percentile statistic-snapshot latency below 50 ms on a documented representative desktop, to be validated with repeated measurements; raw CI timing is not a browser p95.
- **Release recovery objective:** Restore known-good static `main` build with manually triggered Pages publish; timing unmeasured. Never use a forced `main` reset to roll back.

## Incident response and recovery runbook

1. **Triage:** Record URL, time in UTC, deployed Git SHA, browser version, reproduction steps and screenshot/console errors (redact personal or secret data).
2. **Separate failures:** Distinguish GitHub Pages unavailable/assets 404, CDN/WASM unavailable, statistics mismatch and stale display. Avoid mislabeling CDN outage as incorrect ONNX prediction.
3. **Contain:** Pause new publication. For unsafe content, seek project lead approval to remove or replace it. Do not alter merged `main` without review.
4. **Diagnose:** Open Actions → Quality Checks; inspect `verifyEnterprise` and `verifyOnnxRuntime`; inspect the manual Pages run; check browser Network tab for `/matchwork/assets/` and jsDelivr.
5. **Recover:** Rebuild/test a hotfix branch; merge only after review; manually run the Pages publishing workflow on verified `main`. Confirm HTTP and browser smoke tests after publish.
6. **Close:** Record root cause, scope, corrective action, verification evidence, and any residual risk. Re-run normal CI and add regression coverage.

## Local verification (Node.js 24)

```bash
npm ci
npm run build
npm run lint
node scripts/verifyGenerator.mjs
node scripts/verifyStats.mjs
node scripts/verifyReplay.mjs
node scripts/verifyIntegration.mjs
node scripts/verifyIntelligence.mjs
MATCHWORK_PAGES=true npm run build
node scripts/verifyPagesBuild.mjs
node scripts/verifyEnterprise.mjs
```

Actual ONNX WASM smoke test is performed in GitHub Actions using the pinned temporary `onnxruntime-web` install. If any check fails, do not approve the PR. The enterprise gate reports elapsed CPU timings **for diagnostics only**; do not describe them as representative production SLA results.

## Stakeholder value and adoption path

- **Fans:** evidence-linked match context without needing licensed broadcast footage for the hackathon prototype.
- **Analysts:** replay-specific event IDs, counts and model transparency.
- **Production/broadcast integrators:** potential typed event ingestion and synchronized overlay export after proper API contracts, schema validation and editorial controls.
- **Adoption stages:** (1) static demonstration (current) → (2) validated integration sandbox with authenticated synthetic event ingestion → (3) observability and editorial approval → (4) load and accessibility qualification → (5) production contractual/data protection/security review.
- **Impact measurement plan:** time to contextual recap, consistency of evidence attribution, reviewer correction rate, p95 inference latency and audience understanding in a structured user study. **No ROI or broadcaster adoption claim has been validated.**

## Open release gates

- [ ] #3: mobile/accessibility acceptance and overlay polish reviewed.
- [ ] #4: browser CDN failure / rapid-seek integrity tests reviewed.
- [ ] Real user/device performance and accessibility measurements recorded.
- [ ] Third-party notices and contributor intellectual-property / license decision documented.
- [ ] GitHub branch protection and environment approvals confirmed by repository owner.
- [ ] Live website availability and fallback rechecked after final merge/redeploy.
- [ ] Final demo/submission uses only features actually deployed; no fabricated Foundry, Azure or agent implementation claims.

**No new Azure subscription, Foundry deployment, paid service, telemetry endpoint or production credential is required by this enterprise-readiness phase.**
