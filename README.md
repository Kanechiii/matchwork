# Matchwork — The Game, Understood

**Explainable, evidence-linked football intelligence for fans and analysts.** Built for the Microsoft × Premier League *Inside the Game: Developer Hackathon 2026*.

[Live secure demo](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/) · [Repository](https://github.com/Kanechiii/matchwork) · [Documentation](docs/README.md) · [Release checklist](docs/RELEASE_CHECKLIST.md)

> **Synthetic demonstration:** All teams, players and football events are fictional. Matchwork does not ingest live Premier League data or footage. ONNX model scores are illustrative and are not calibrated predictions for real matches.

## Overview

Matchwork turns a seeded 90-minute fictional football match into synchronized replay, event-derived statistics, contextual intelligence and evidence-linked recaps. The experience separates accessible **Fan** explanations from more detailed **Analyst** interpretation. The app remains useful when either AI service is unavailable: rules-based insight continues and ONNX availability is disclosed.

## Try the Demo

1. Open the [secure application](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/). Allow for a cold start after inactivity.
2. Play, pause, restart or seek the fictional match. Inspect synchronized score, event feed and statistics.
3. Explore Fan and Analyst explanations and inspect cited event identifiers.
4. Observe replay-linked recaps, and distinguish model-backed content from deterministic fallback when the UI exposes its source.

**Access boundary:** Public viewing does not imply unauthenticated access to paid model endpoints. Both `POST /api/insights` and `POST /api/agents/insights` require server-side bearer authorization. Never publish the token or embed it in browser JavaScript. The opt-in browser operator session is not a public sign-in system. A visible recap alone does not establish that a Foundry model request ran.

## Architecture

```text
Seeded fictional match + replay event generator
                   │
                   ▼
React + TypeScript + Vite dashboard
 ├─ Replay, scoring, match statistics, evidence feed
 ├─ ONNX Runtime Web (synthetic-trained WASM classifier)
 └─ Rule-based fallback and Fan / Analyst explanations
                   │
           Protected API boundary
                   ▼
FastAPI in Azure Container Apps (Japan East)
 ├─ Trusted evidence ledger (exported from seeded replay)
 ├─ Bearer-token protected single-agent and specialist endpoints
 ├─ Microsoft Foundry model inference (opt-in specialist path)
 ├─ Atomic Redis shared attempt budget (enabled on secure demo)
 └─ Explicit AI-unavailable and budget-limited fallback

GitHub Actions → GHCR image → Azure Container Apps
                            ↕ private VNet / TLS
                         Azure Managed Redis
```

The backend verifies `match_id`, `as_of_seconds`, `evidence_ids` and `audience` against a canonical server-side replay ledger. It does **not** accept caller-authored `fallback_text` or arbitrary match descriptions. The multi-agent path includes model-backed specialist roles, bounded handoff and evidence auditing; **its existence in the repository is not proof that the public UI invokes it**.

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS |
| Replay and analysis | Deterministic seeded events, rolling context, event-derived statistics |
| Browser ML | Microsoft ONNX Runtime Web / WASM with synthetic prototypes |
| Backend | Python 3.12, FastAPI, trusted evidence validation |
| Generative AI | Microsoft Foundry; Agent Framework-backed specialist workflow is opt-in |
| Hosting | Azure Container Apps, GHCR, GitHub Actions |
| Cost safeguards | Azure Managed Redis atomic shared AI-attempt ledger, per-process concurrency, quotas and budget alerts |

## Local Development

Requires Node.js 24, npm and Python 3.12+.

```powershell
git clone https://github.com/Kanechiii/matchwork.git
cd matchwork
npm ci
npm run dev
```

For the backend, in another terminal:

```powershell
python -m pip install -r backend/requirements.txt
node scripts/exportReplay.mjs
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The browser replay and rule-based recap work without paid AI credentials. Paid endpoints require an appropriately configured server-side access token, trusted evidence payload, Foundry endpoint and an available shared attempt ledger. Keep `MATCHWORK_AI_ENABLED=false` until those safeguards are configured. See [API security](docs/PHASE7B_API_SECURITY.md) and [Foundry workflow](docs/FOUNDRY_MULTI_AGENT.md). Do not commit credentials or `.env` files.

## Verification

```powershell
npm ci
node scripts/exportReplay.mjs
npm run build
npm run lint
python -m unittest discover -s backend/tests -p 'test_*.py'
python -m backend.evaluate_agents
```

Additional reproducibility, replay, ONNX, enterprise and workflow checks run in [GitHub Actions](.github/workflows/quality.yml).

## Security, Cost and Limitations

- The canonical synthetic ledger and event IDs support auditing but do not establish factual correctness of generated narratives.
- The ONNX classifier is trained on synthetic prototypes, not a real-world validated football dataset.
- The API bearer token remains server-side; the optional operator cookie/session is not production identity management.
- The secure Azure demo uses a private-endpoint Redis instance and an atomic hourly/daily reservation script for **shared AI attempt limits**. A reservation test succeeded; this is **not** a hard spending cap, user quota or durable audit trail.
- Azure budgets notify; they do not automatically shut off billable inference. Redis loss or alternate Foundry clients may bypass attempts recorded by this application.
- A rule-based recap should not be represented as proof of live Foundry inference. Model-backed specialist deployment requires its own verification.
- No official football broadcast media or live Premier League feeds are bundled.

See [deployment evidence](docs/DEPLOYMENT_CURRENT.md), [cost controls](PHASE7_COST_GUARD.md), and [documentation index](docs/README.md).

## Submission Readiness

- [x] Repository with documented synthetic-data limitations
- [x] Publicly reachable secure Azure Container Apps demo and replay/recap smoke test
- [x] Redis-backed shared attempt reservation tested in the secure environment
- [ ] Verify model-backed Foundry output separately from rules-based fallback for judging
- [ ] Check desktop/mobile presentation, screenshots and incognito access
- [ ] Publish a demo video **under two minutes**
- [ ] Confirm contributor permissions and license decision
- [ ] Complete submission at [Inside the Game](https://aka.ms/insidethegame)

**Deadline:** October 27, 2026, 11:59 PM Pacific time (October 28, 2026, 2:59 PM Philippines). Detailed acceptance steps: [release checklist](docs/RELEASE_CHECKLIST.md).
