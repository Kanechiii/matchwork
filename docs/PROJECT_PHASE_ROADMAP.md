# Matchwork — Consolidated Phase Roadmap Through Hackathon Submission

## Purpose

One chronological, evidence-aware tracker for Matchwork's work from the initial project through the *Inside the Game: Developer Hackathon 2026* submission. This roadmap folds the proposed multi-team and player-intelligence expansion into existing work **without retroactively claiming the new feature is implemented**.

**Scope labels:** "Merged" means the relevant changes reached `main`; "Implemented" means a component or control exists but all operational / browser evidence may not yet be captured; "Planned" means no implementation is claimed. Existing GitHub PR descriptions explicitly name Phases 2, 3, 4, 6 and 7. Phases 1 and 5 below are retrospective organizational headings; Phases 8–10 are **proposed** tracking stages, not previously approved hackathon milestones.

**Current snapshot:** October 28, 2026 (Philippine time). The official hackathon submission closes **October 27, 2026, at 11:59 PM Pacific** (**October 28, 2026, at 2:59 PM Philippines**). Do not let an optional expansion replace or delay a working entry.

## End-to-End Phase Status

| Phase | Workstream and deliverable | Evidence / current state | Progress |
| --- | --- | --- | --- |
| 1 — Foundation | Project concept, React/Vite groundwork, challenge definition, synthetic-only data boundaries | Repository, official challenge and documented product scope; retrospective heading | Complete as foundation |
| 2 — Match Engine | Deterministic seeded synthetic match, 22-player fixture, events, team statistics, timeline and 1×/4×/16× replay | [PR #1](https://github.com/Kanechiii/matchwork/pull/1) merged; `verifyGenerator`, `verifyStats`, `verifyReplay` | Merged |
| 3 — Explainable Intelligence | Rolling event features, ONNX Runtime Web synthetic prototype classifier, state explanations, Fan/Analyst narration and deterministic recaps | [PR #2](https://github.com/Kanechiii/matchwork/pull/2) merged; `verifyIntelligence` and ONNX checks | Merged; real-world accuracy is **not** claimed |
| 4 — UI and AI integrity | Figma Make light/dark design, responsive studio, scrolling story, keyboard/motion, traceable evidence and sampled ONNX integration | [Issues #3](https://github.com/Kanechiii/matchwork/issues/3)/[#4](https://github.com/Kanechiii/matchwork/issues/4) closed; [PRs #8](https://github.com/Kanechiii/matchwork/pull/8), [#15](https://github.com/Kanechiii/matchwork/pull/15), [#16](https://github.com/Kanechiii/matchwork/pull/16) merged | Merged; retain browser-evidence limitations |
| 5 — Release / Preview | GitHub Pages subpath-safe build, gated CI, manual publishing, submission checklist | [PR #5](https://github.com/Kanechiii/matchwork/pull/5) merged; Pages workflow uses **manual** `workflow_dispatch` | Implemented; confirm current public publication separately |
| 6 — Enterprise Readiness | Reproducibility, malformed-event rejection, anti-future-leakage, secret scanning, audit and regression safeguards | [PR #6](https://github.com/Kanechiii/matchwork/pull/6) merged; `verifyEnterprise`; [enterprise notes](ENTERPRISE_READINESS.md) | Implemented, not an enterprise SLA guarantee |
| 7 — Azure, Foundry and Agents | Secure FastAPI/Container Apps, trusted replay ledger, Foundry evidence and two-specialist path, testing/observability, Redis shared attempt budget | [PRs #7](https://github.com/Kanechiii/matchwork/pull/7), [#11](https://github.com/Kanechiii/matchwork/pull/11), [#13](https://github.com/Kanechiii/matchwork/pull/13) merged; [Azure evidence](DEPLOYMENT_CURRENT.md), [budget caveats](../PHASE7_COST_GUARD.md) | Implemented; **real model-backed demo and judge access still require verification** |
| 8 — Multi-Team & Player Intelligence (**new**) | Reusable clubs, fixtures, event-grounded player statistics, match switcher; optional trusted multi-fixture backend | Proposed below; current `TeamId` and trusted ledger still assume two clubs / one match | Planned |
| 9 — Final Integration and Demo Freeze (**new**) | Regression, browser QA, source/evidence checks, demo reliability, release decision | [Release checklist](RELEASE_CHECKLIST.md) | Pending |
| 10 — Official Submission (**new**) | Public source, playable demo, pitch and public video under 2 minutes, portal confirmation | Official rules; no repository file proves a successful completed portal submission | Pending independent confirmation |

## Phase 8 — Multi-Team & Player Intelligence

### Goal

Prove Matchwork can support several **fictional** teams and fixtures, while making player cards reflect only identifiable, observed synthetic events. This is a **product roadmap extension**; it is not needed to demonstrate the challenge's five-stage ingest → interpret → explain → render → personalize pipeline.

**Suggested eventual test fixture:** 6 fictional teams × 11 rostered players = 66 stable players, with 9 fixtures over three matchdays. These are planning targets, **not currently generated data or advertised features**.

### 8A — Data and Match Registry (first implementation gate)

- [ ] Replace hard-coded `TeamId = "northbridge" | "harborpoint"` with stable validated team IDs; retain the existing demo fixture as a regression fixture.
- [ ] Define typed team roster and fixture manifests: `teamId`, `playerId`, `matchId`, home/away IDs, time, synthetic seed and event count.
- [ ] Reuse `generateSyntheticMatch(metadata, { seed })` deterministically; avoid altering the existing scoring/possession invariants.
- [ ] Treat `(matchId, eventId)` as the canonical evidence key because generated `evt-####` IDs repeat between matches.
- [ ] Test unique team/player identities, fixtures with two distinct clubs and valid 11-player rosters, seed repeatability and unchanged Phase 2 fixture outcomes.

### 8B — Player Statistics Engine

- [ ] Add a pure `calculatePlayerStats(match, throughSeconds)` module with replay-aware counts: goals, shots, shots on target, passes attempted/completed/received, tackles attempted/won and defensive pressures.
- [ ] Create per-fixture and cross-fixture aggregates; league-level cumulative figures must not leak future/currently unobserved fixture events into a replay-specific view.
- [ ] Link each reported statistic to event IDs and reconcile totals with `calculateMatchStats`.
- [ ] Include zero-event players, keepers, timestamp boundaries, repeated event IDs across fixtures, and team transfers (if later modeled) in validation.
- [ ] Do **not** fabricate assists, xG, verified goalkeeper saves, distance covered or arbitrary player ratings: these require additional recorded attributes and defined formulas.

### 8C — Figma UI Extension

- [ ] Add **Fixtures**, **Teams** and **Players** navigation to the existing Figma design; avoid replacing the landing page or match studio.
- [ ] Add a searchable fixture/team selector, a squad list and player cards with real computed statistics (plus a clear "synthetic" disclosure).
- [ ] Keep Fan mode concise; make evidence IDs, per-window definitions, provenance and technical breakdowns available to Analysts.
- [ ] On match change, reset replay/selection and invalidate prior ONNX/Foundry responses so responses cannot appear for the wrong fixture.
- [ ] Verify mobile, tablet, desktop, keyboard focus, touch targets, loading/empty states and reduced motion.

### 8D — Trusted Multi-Fixture AI (backend integration)

- [ ] Extend the canonical replay exporter and FastAPI `trusted_evidence.py` validator from one fixed `MATCH_ID` and ledger to a checksum-verified fixture registry.
- [ ] Ensure the trusted request includes `match_id` and `as_of_seconds`; reject unknown fixture IDs, foreign event IDs, future timestamps and tampered ledgers.
- [ ] Leave Foundry paid endpoints authenticated and budgeted. New fixtures may use deterministic rule-based fallback until validated on the server.
- [ ] Preserve the honest distinction among deterministic text, the synthetic-trained ONNX model, and genuine Foundry output.

### Phase 8 exit criteria

- [ ] Switching fixtures updates scoreboard, stream, pitch, player cards, recap and selected team, **not just displayed names**.
- [ ] Player totals reconcile with actual events and team totals for every test fixture; samples show no future leakage.
- [ ] All existing Phase 2–7 CI checks remain green.
- [ ] No model, backend auth, Azure spending or deployment changes are required just to demonstrate frontend fixtures.

**Schedule gate:** Ship only a small, fully verified Phase 8A–8C if it can be completed before the demo freeze. Otherwise retain Phase 8 as a documented next step and submit the tested single-fixture version. Do not advertise the 6-team/9-fixture concept as already shipped. Phase 8D should normally remain **after submission**, unless independently tested and authorized.

## Phase 9 — Integration, Freeze and Final Evidence

### Mandatory checks for whichever scope is actually shipped

- [ ] Verify `npm ci`, `npm run build`, `npm run lint`, generated replay export, all Node replay/AI/statistics/enterprise scripts and Python backend tests on the **final SHA**.
- [ ] At 390px, 768px and 1280px inspect landing page, studio, Fan/Analyst switching, team and player views **if shipped**, legible labels and synthetic disclaimers.
- [ ] Verify 00:14 → 00:15 → 00:16; 00:29 → 00:30 → 00:15, backwards seeks, restart, 1×/4×/16× and correct ONNX `asOfSeconds`/evidence.
- [ ] Block CDN/WASM; validate fallback and retry while replay, statistics and recap remain functional.
- [ ] If multi-fixture support shipped, verify match switching during outstanding ONNX/Foundry calls; test fixtures' event attribution and backend fail-closed behavior.
- [ ] Verify one **actually model-backed** Foundry response by source and evidence IDs separately from the deterministic rule-based fallback; do not claim one if it could not be confirmed.
- [ ] Verify public secure Azure URL and GitHub Pages from an incognito device; a merged PR or passing Pages build **does not** prove deployment.
- [ ] Freeze approved code for the demo, collect evidence screenshots/CI SHA, and avoid last-minute redesigns or paid model changes without rollback.

### Stop/go rule

If any new Phase 8 work threatens the stable synthetic replay, evidence integrity, public demo, build or under-two-minute video, **defer it**. Treat a truthful, working single-match demo as the release baseline.

## Phase 10 — Submission

Official requirements, rather than internal feature ambitions, control the final deliverables.

- [ ] Complete an accurate short project pitch/description naming the **actual** Microsoft/Azure technologies in use and the problem solved.
- [ ] Publish a **public video under two minutes**, showing the actual functioning application on its intended platform. Use only cleared/licensed media.
- [ ] Confirm the public GitHub repository URL is accessible and reflects the demo code.
- [ ] Confirm an accessible functioning application URL and share how judges can explore it without exposing private credentials.
- [ ] Check user documentation does not imply paid Foundry model use where output is rules-based or unverified.
- [ ] Submit through the [official portal](https://aka.ms/insidethegame) **before October 27, 2026 at 11:59 PM Pacific / October 28 at 2:59 PM Manila time**.
- [ ] Record submission confirmation, final commit SHA, demo URL and video URL privately.
- [ ] After submission, avoid making unverified changes to the judge-visible demo; document follow-up experiments in new PRs.

### Suggested two-minute storyboard

| Segment | Show |
| --- | --- |
| 0–12s | Football insight problem + Matchwork's value |
| 12–30s | Synthetic fixture and functioning replay |
| 30–52s | Event-derived stats, timeline seek, evidence |
| 52–74s | Fan versus Analyst narratives and as-of timing |
| 74–94s | ONNX status + truthful fallback; optional player card if **actually built** |
| 94–110s | Azure/Foundry architecture, trust safeguards and final takeaway |

Target 100–110 seconds for a safe margin below two minutes. The judging criteria assign 20% each to technical implementation, agentic design/innovation, real-world applicability, UX/presentation and category adherence.

## Release Decision and Risk Notes

1. **Truthfulness over feature count:** synthetic teams, players, events and illustrative ONNX scores must never look like real professional results.
2. **Multi-fixture evidence is a security boundary:** the current server ledger validates one canonical match; a selector cannot be treated as authorization for arbitrary Foundry evidence.
3. **Avoid false readiness:** Azure Container Apps + Redis attempt budgeting has been exercised, but reservations are not a hard spending cap; Foundry model-backed response still needs a distinct judge-facing check.
4. **Documentation chronology:** old Phase 7 release-gate documents describe earlier design states. Prefer the current [deployment snapshot](DEPLOYMENT_CURRENT.md) and [release checklist](RELEASE_CHECKLIST.md).
5. **Submission beats scope expansion:** the Phase 8 roadmap is a differentiator if it can be demonstrated reliably, but it is not a reason to miss the deadline.

## Related Documents and Pull Requests

[Project README](../README.md) · [Documentation index](README.md) · [Release checklist](RELEASE_CHECKLIST.md) · [Azure deployment](DEPLOYMENT_CURRENT.md) · [Enterprise checks](ENTERPRISE_READINESS.md) · [Foundry multi-agent](FOUNDRY_MULTI_AGENT.md) · [Phase 4 UI issue #3](https://github.com/Kanechiii/matchwork/issues/3) · [Merged Figma PR #15](https://github.com/Kanechiii/matchwork/pull/15) · [ONNX sample-fix PR #16](https://github.com/Kanechiii/matchwork/pull/16)
