# Matchwork Documentation — Index

## Purpose

This index organizes current engineering guidance separately from historical phase decisions. Start with the [repository README](../README.md) for the public demo and quick setup. All deployment claims must be supported by tests or identified as pending.

## Current Guides

| Document | Description |
| --- | --- |
| [Consolidated project roadmap](PROJECT_PHASE_ROADMAP.md) | Historical phases 1–7, proposed multi-team Phase 8, and submission phases 9–10 |\n| [Current Azure deployment](DEPLOYMENT_CURRENT.md) | Confirmed Container Apps, VNet, Redis, secrets and deployment checks |
| [Release checklist](RELEASE_CHECKLIST.md) | Hackathon acceptance, demo and submission gates |
| [Documentation standards](DOCUMENTATION_STYLE.md) | Naming, consistent sections and checklist conventions |
| [Foundry cost controls](../PHASE7_COST_GUARD.md) | Shared-attempt budgets, fail-closed limits and spending caveats |
| [Foundry multi-agent](FOUNDRY_MULTI_AGENT.md) | Specialist orchestration, evidence audit and opt-in settings |
| [Foundry evaluation](FOUNDRY_EVALUATION_OBSERVABILITY.md) | Offline evaluation, telemetry and known gaps |
| [Protected API](PHASE7B_API_SECURITY.md) | Bearer authorization and canonical evidence payload |
| [Operator browser session](PHASE7E_OPERATOR_SESSION.md) | Opt-in operator flow and its security limitations |
| [Shared Redis budget](PHASE7E_SHARED_BUDGET.md) | Atomic reservation implementation and historical rollout note |
| [Phase 7 release gates](PHASE7_RELEASE_GATES.md) | Security and release acceptance criteria |

## Historical and Experimental Records

Earlier documents—including `WORKFLOW_PROTOTYPE.md`, `ENTERPRISE_READINESS.md` and previous phase checklists—describe the system at their authorship date. Their older deployment links, security notes and planned features must not override the current deployment guidance above. Historical documentation is intentionally retained rather than destructively relocated.

## Documentation Acceptance Checklist

- [x] Public README identifies the current secure demo and synthetic-data limits
- [x] Current deployment evidence is distinct from older deployment notes
- [x] Protected backend routes and shared Redis budgeting are documented
- [ ] Verify every historical note for obsolete links during the next documentation cleanup
- [ ] Verify live Foundry source status and judge-visible controls before final submission
- [ ] Keep newly added Markdown aligned with [style guide](DOCUMENTATION_STYLE.md)
