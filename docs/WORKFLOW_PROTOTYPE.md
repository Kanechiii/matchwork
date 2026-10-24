# Matchwork specialist workflow prototype (experimental)

This is an independently testable **multi-specialist orchestration prototype**, not a production LLM multi-agent system and not a deployed user-facing feature. It is separate from collaborator-owned UI (#3), ONNX runtime/evidence (#4), Microsoft Foundry, and Azure.

## Design

`intake → analyst → narrator → auditor`

- **Intake:** validates the requested match clock and runs the trusted event statistics engine; malformed match sequences fail rather than producing fake insights.
- **Analyst:** extracts only events within the three-minute feature window ending at the requested replay clock. It hands off a structured narrative request with observed stats and source event IDs.
- **Narrator:** accepts an optional asynchronous model-backed adapter that returns a narrative draft and event citations; without an adapter, produces an explicitly deterministic synthetic narrative.
- **Auditor:** checks that claimed citations belong to the authorized, as-of event window. Invalid citations or adapter outages recover to the factual deterministic narrative. A trace distinguishes genuine adapter use from fallback.

The pipeline is testable locally with **no credentials, cloud services, or fees**. The external adapter interface is injection-only: it does not ship an LLM, contact a model API, or perform autonomous reasoning. Supplying a real model client and validating its generated *claims* are separate requirements. Valid event IDs prove provenance eligibility, **not** factual correctness of every sentence. Human editorial review is required for any public model-generated text.

## Run

```bash
npm ci
node scripts/verifyWorkflow.mjs
npm run build
```

Tests cover 0:00, 15s, 60s, 3m, halftime and full-time; deterministic repeatability; 4-stage trace; successful adapter result; forbidden future citation rejection; provider outage recovery; and invalid clocks. The full GitHub Actions quality workflow also checks the existing ONNX model, enterprise audit and Pages build.

## Next phase (not yet authorized)

To qualify meaningfully for the **Best Multi-Agent System** award, implement **two or more real model-backed agents** with distinct responsibilities and explicit inter-agent communications, tool use, decision points, observable handoffs, coordination recovery, and reproducible evaluation. Microsoft Agent Framework has official support for multi-agent orchestration and workflows. Consider a Foundry-backed deployment only after verifying subscription cost, credit and official eligibility. Keep LLM credentials server-side, never in GitHub Pages bundles.

The experimental workflow is deliberately *not* connected to the public UI. Claims for hackathon judging must match the actual deployed behavior. Merge and manual publication require separate project-lead approval.
