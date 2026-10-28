# Matchwork — The Game, Understood

**Explainable, evidence-linked football intelligence for fans and analysts.** Built for the Microsoft × Premier League *Inside the Game: Developer Hackathon 2026*.

[Live Azure Studio](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/#/studio) · [GitHub Pages landing](https://kanechiii.github.io/matchwork/) · [Repository](https://github.com/Kanechiii/matchwork) · [Documentation](docs/README.md) · [Release checklist](docs/RELEASE_CHECKLIST.md)

> **Synthetic demonstration:** All teams, players and football events are fictional. Matchwork does not ingest live Premier League data or footage. ONNX model scores are illustrative and are not calibrated predictions for real matches.

## Overview

Matchwork turns nine seeded 90-minute fictional football fixtures into synchronized replay, event-derived statistics, contextual intelligence and evidence-linked recaps. The experience separates accessible **Fan** explanations from more detailed **Analyst** interpretation. The app remains useful when either AI service is unavailable: rules-based insight continues and ONNX availability is disclosed.

## Try the Demo

1. Open the [fully functional Azure Studio](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/#/studio), or visit the [GitHub Pages landing](https://kanechiii.github.io/matchwork/) and select Studio (which opens Azure). Allow for a cold start after inactivity.
2. Select any of nine fictional fixtures. Play, pause, restart or seek the match. Inspect synchronized score, event feed, player profiles and statistics.
3. Explore Fan and Analyst explanations and inspect cited event identifiers.
4. Pause or seek to automatically request an evidence-linked Microsoft Foundry narrative in **Match story** without signing in. Inspect the **Microsoft Foundry** source badge and cited synthetic event IDs; when inference is unavailable or its allowance is exhausted, Match story displays a clearly labeled deterministic fallback.

**Access boundary:** The Azure Studio provides a narrowly scoped anonymous `POST /api/public/agents/insights` endpoint with canonical server-side evidence, exact-origin checks, shared Redis quotas and per-fixture caching. Separate administrative `POST /api/insights`, `POST /api/agents/insights`, and browser operator routes remain protected. No Foundry API keys or Redis credentials are shipped to the browser. GitHub Pages is static: its Studio entry redirects to Azure rather than trying to call a cross-origin API or emulate live Foundry inference.

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
 ├─ Nine checksum-verified ledgers (one per seeded fixture)
 ├─ Public bounded narrative route plus protected administrative endpoints
 ├─ Microsoft Foundry model inference (opt-in specialist path)
 ├─ Atomic Redis shared attempt budget (enabled on secure demo)
 └─ Explicit AI-unavailable and budget-limited fallback

GitHub Actions → GHCR image → Azure Container Apps
                            ↕ private VNet / TLS
                         Azure Managed Redis
```

The backend verifies the selected fixture and replay clock against its own checksum-verified event ledger and selects observed event IDs itself for public requests. It does **not** accept caller-authored match descriptions, scores or fallback text. The public workflow runs model-backed Tactical Analyst and Narrative Agent specialists followed by an evidence-citation auditor; a live response is identifiable by `source: foundry` and `status: success`. This was verified in the Azure browser on original and additional fixtures.

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

Browser replay and rule-based recaps work without paid AI credentials. The public AI preview is enabled only on the Azure server with trusted evidence, a deployed Foundry model, a Redis-backed shared attempt ledger and conservative request quotas. Keep `MATCHWORK_AI_ENABLED=false` for any environment without these safeguards. See [API security](docs/PHASE7B_API_SECURITY.md) and [Foundry workflow](docs/FOUNDRY_MULTI_AGENT.md). Do not commit credentials or `.env` files.

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

## GitHub Pages and Azure Studio

GitHub Pages publishes the static landing page at [kanechiii.github.io/matchwork](https://kanechiii.github.io/matchwork/). Studio navigation transfers visitors to the [Azure-hosted application](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/#/studio). This design keeps **live Foundry, ONNX, fixture selection and replay functional** without weakening the exact Azure Origin protection or exposing cloud credentials. Pages by itself does **not** host the AI backend.

## Nine-fixture Foundry narratives

The Match story supports automatic, evidence-linked Microsoft Foundry narration for **all nine fictional league fixtures**. Pause or seek in any fixture; the browser submits its fixture ID, sampled match clock, and Fan/Analyst audience. The server selects the last five observed events from that fixture's own checksum-verified seeded replay; arbitrary client event descriptions and future events are never accepted. The Tactical Analyst and Narrative Agent use this bounded evidence, followed by a citation auditor.

Narratives are **opt-in at the server**, controlled by `MATCHWORK_PUBLIC_AI_ENABLED`, Redis-backed public and global quotas, and server-side model credentials. Successful generated narratives are cached per fixture + audience + observed clock and can be reused safely from earlier match moments. When the budget is exhausted or Foundry is unavailable, every fixture retains the deterministic story and browser-side ONNX classification. Automatic narration is requested after pauses/seeks, not on every live playback tick. All fixtures and evidence are synthetic.

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
- [x] Verify model-backed Foundry output separately from rules-based fallback on Azure for the original and additional fixtures
- [ ] Check desktop/mobile presentation, screenshots and incognito access
- [ ] Publish a demo video **under two minutes**
- [ ] Confirm contributor permissions and license decision
- [ ] Complete submission at [Inside the Game](https://aka.ms/insidethegame)

**Deadline:** October 27, 2026, 11:59 PM Pacific time (October 28, 2026, 2:59 PM Philippines). Detailed acceptance steps: [release checklist](docs/RELEASE_CHECKLIST.md).
