# Matchwork — The game, understood.

**Explainable, evidence-linked football intelligence from fictional match events.** Built for the Microsoft × Premier League **Inside the Game: Developer Hackathon 2026**.

[**Launch the live demo**](https://matchwork-demo.lemondesert-a73cf52e.japaneast.azurecontainerapps.io/) · [**View source**](https://github.com/Kanechiii/matchwork) · [**Release checklist**](docs/RELEASE_CHECKLIST.md)

> **Synthetic-data demonstration.** All teams, players, match events, and replay statistics are fictional. Matchwork does **not** use live Premier League match feeds, actual match footage, or authentic player-tracking data. Its small ONNX model is trained on synthetic prototypes; its scores are not calibrated real-world probabilities.

## Why Matchwork?

A scoreline tells viewers *what* happened, not *why a moment matters*. Matchwork transforms a reproducible 90-minute synthetic football event stream into time-synchronized match statistics, evidence-based explanations, and two ways to explore the game.

The application demonstrates five steps: **ingest** synthetic football events → **interpret** statistics and three-minute context windows → **explain** moments and their supporting event IDs → **render** replay-synchronized intelligence → **personalize** for **Fan** and **Analyst** audiences.

## Try the demo

Open the [public Matchwork dashboard](https://matchwork-demo.lemondesert-a73cf52e.japaneast.azurecontainerapps.io/) in a desktop or mobile browser. No account or payment is required.

1. **Explore the match.** Play, pause, restart, or seek through the 90-minute fictional fixture. Change playback speed between **1×, 4×, and 16×**.
2. **Inspect event-grounded insight.** Watch the score, events, replay statistics, and rolling three-minute intelligence update with the replay clock.
3. **Compare audiences.** Toggle **Fan** for an accessible explanation and **Analyst** for additional tactical context and model-score caveats; use team focus where shown.
4. **See two AI paths.** The browser runs an illustrative **ONNX Runtime Web** classifier for control, pressure, and transition patterns. When the replay is paused or finishes, the backend can request a short explanation from **Microsoft Foundry**, grounded in the supplied synthetic evidence.
5. **Observe transparent fallback.** If Foundry is disabled, unavailable, or rate-protected, the API returns a **rule-based** explanation and an explicit status. If ONNX resources cannot load, the interface reports that inference is unavailable rather than inventing a prediction.

The demo may take longer to respond on the first request after inactivity because Azure Container Apps is configured to scale to zero.

**Judging/test access:** [Live application](https://matchwork-demo.lemondesert-a73cf52e.japaneast.azurecontainerapps.io/) · [Health endpoint](https://matchwork-demo.lemondesert-a73cf52e.japaneast.azurecontainerapps.io/health). The public demonstration is provided without login credentials. The backend may serve rule-based explanations when the Foundry request allowance is exhausted.

## Architecture

```text
Fictional teams and reproducible synthetic event generator
       │
       ▼
React + TypeScript + Vite web dashboard
       ├── Timeline replay, score, events, statistics
       ├── Three-minute features + source event IDs
       ├── ONNX Runtime Web (browser/WASM, synthetic-trained classifier)
       ├── Deterministic insights and rolling match recap
       └── Fan / Analyst presentation
                    │
           Pause or finished replay
                    ▼
         POST /api/insights (same origin)
                    │
       Python FastAPI on Azure Container Apps
          ├── Input validation and request safeguards
          ├── Microsoft Foundry model endpoint
          └── Rule-based fallback with explicit status

GitHub Actions → checks + manually published GHCR container image
GHCR image → Azure Container Apps (Japan East; HTTPS)
```

- **Frontend:** React 19, TypeScript, Vite 8, CSS, replay/statistics engines.
- **Browser inference:** Microsoft ONNX Runtime Web WASM, version-pinned CDN assets, small embedded synthetic-prototype classifier.
- **Server inference:** Python 3.12, FastAPI, Microsoft Foundry via the OpenAI-compatible Responses API; API key supplied only as a server-side Container Apps secret.
- **Hosting:** Azure Container Apps Consumption in Japan East, container image published by GitHub Actions to GitHub Container Registry (GHCR).
- **Validation:** GitHub Actions checks TypeScript build, lint, event/statistics/replay consistency, synthetic model reproducibility, ONNX inference, and request-budget tests.

The experimental [four-stage specialist workflow prototype](docs/WORKFLOW_PROTOTYPE.md) is tested separately. **It is not deployed as a multi-agent LLM application.** Do not confuse this prototype with the live Foundry explanation endpoint.

## Local development

**Prerequisites:** Node.js 24, npm, Python 3.12+ (for the API).

```bash
git clone https://github.com/Kanechiii/matchwork.git
cd matchwork
npm ci
npm run dev
```

Vite displays the local frontend address (typically `http://localhost:5173`). Frontend replay, synthetic match statistics, and browser ONNX inference are usable without Foundry credentials. API calls through `/api/insights` need the optional FastAPI server; without it, the frontend uses its local rule-based fallback.

To run the optional backend in a **separate terminal**, install its Python dependencies and create a local `.env` file in the repository root:

```bash
python -m pip install -r backend/requirements.txt
```

```dotenv
AZURE_OPENAI_BASE_URL=https://YOUR-FOUNDRY-ENDPOINT/openai/v1/
AZURE_OPENAI_DEPLOYMENT=YOUR-MODEL-DEPLOYMENT
AZURE_OPENAI_API_KEY=YOUR-SECRET-KEY
MATCHWORK_AI_ENABLED=false
MATCHWORK_AI_MAX_CALLS_PER_HOUR=20
MATCHWORK_AI_MAX_CALLS_PER_DAY=50
```

Then start the backend:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Vite proxies `/api` requests to port 8000. Leave `MATCHWORK_AI_ENABLED=false` for zero paid Foundry attempts; explicitly switch to `true` only with valid Foundry configuration and authorization to incur API charges. **Never commit `.env` or credentials.**

## Build and verification

```bash
npm ci
npm run build
npm run lint
node scripts/verifyGenerator.mjs
node scripts/verifyStats.mjs
node scripts/verifyReplay.mjs
node scripts/verifyIntegration.mjs
node scripts/verifyIntelligence.mjs
node scripts/verifyEnterprise.mjs
node scripts/verifyWorkflow.mjs
python -m unittest discover -s backend/tests -p 'test_*.py'
```

CI additionally tests actual ONNX Runtime Web WASM inference and reproducible model training. See [quality workflow](.github/workflows/quality.yml) for the complete commands and CI-only dependencies.

## Foundry usage and cost protection

`POST /api/insights` accepts an audience (`fan` or `analyst`), validated match evidence, and a `fallback_text`. Replies identify their origin (`foundry` or `rule-based`), explanation, evidence IDs, and a status such as `success`, `ai_disabled`, `ai_unavailable`, `ai_busy`, `ai_hourly_limited`, or `ai_daily_limited`.

The demo deployment uses a **10,000 tokens/minute** Foundry allocation and attempts to limit model calls to **20 per hour** and **50 per UTC day**. These counters are **per Python process and reset on process restart or new instance**; they do not guarantee a hard monetary cap. Azure Cost Management budget alerts are configured separately and **do not automatically stop spending**. Details: [Phase 7 cost guard](PHASE7_COST_GUARD.md).

Production deployment uses prebuilt images from GHCR. The student subscription did not permit ACR Tasks, so `az acr build` and `az containerapp up --source .` are not the release path.

## Data provenance, security, and limitations

- **Fictional data only:** The generator creates a repeatable 90-minute match, usually configured for approximately 900–1,400 events. Possession and pressure are estimates computed from synthetic events, not live sensors.
- **Explainability:** Structured evidence IDs are retained with request/response data. This supports traceability, but **an ID alone does not prove every generated statement is correct**.
- **Model honesty:** The ONNX classifier is an illustrative logistic model trained on handcrafted synthetic-state prototypes. It has not been validated against real matches; its output scores are not calibrated probabilities.
- **AI resilience:** Browser ONNX inference depends on external CDN resources. Microsoft Foundry requires network access and a configured backend deployment. Fallback behavior is explicit when either path is unavailable.
- **Cost and abuse:** The public inference endpoint has basic request-size, attempt-rate, and concurrency safeguards, but **no user authentication or durable, globally enforced cost ledger**. This is a hackathon prototype, not an enterprise SLA.
- **Rights:** The project intentionally does not redistribute Premier League match footage, match data, third-party music, or unlicensed broadcast material.

For additional boundaries and prototype-only architecture, see [enterprise readiness notes](docs/ENTERPRISE_READINESS.md) and [workflow prototype](docs/WORKFLOW_PROTOTYPE.md). Some historical phase documents predate the production Azure/Foundry deployment.

## Hackathon submission

- **Official project portal:** https://aka.ms/insidethegame
- **Public app:** https://matchwork-demo.lemondesert-a73cf52e.japaneast.azurecontainerapps.io/
- **Public code:** https://github.com/Kanechiii/matchwork
- **Demo video:** To be recorded and published separately; a public URL is required for the official submission.
- **Project category:** Select the award category that accurately matches the live implementation; Matchwork demonstrates Microsoft Foundry integration and Azure cloud-native hosting.

**Maintainers and contributors:** Review license and contributor permissions before publishing an open-source license. No license is granted merely by making a repository public.
