# Manual QA Evidence — Issue #4

**Branch:** `feature/ai-evidence-resilience`  
**Implementation commit tested:** `fadcee9`  
**Environment:** Windows, Chrome DevTools, local Matchwork development server

> This record distinguishes manual observations reported by the tester from GitHub Actions checks. Screenshots, local terminal output and Fan/Analyst testing are still pending. Do not treat the report as complete acceptance of Issue #4.

## 1. Rapid Scrubbing — PASS (manually reported)

- Replay clock and match statistics remained correct after rapid forward/backward seeking.
- Observed event evidence updated correctly.
- No stale ONNX predictions were observed during the tested seeking sequence.
- ONNX Runtime Web reported the synthetic-trained classifier as available.

## 2. Blocked ONNX/CDN — PASS

- Blocked `ort.min.mjs` using Chrome DevTools.
- Matchwork displayed the AI-unavailable message.
- Replay, match statistics, event feed, and rule-based recaps continued functioning.
- No other failures were reported.

## 3. ONNX Recovery — PASS after subsequent verification

- Removed the request-blocking rule.
- `ort.min.mjs`: HTTP 200.
- ONNX WASM file: HTTP 200.
- The intelligence panel initially remained unavailable despite successful downloads.
- A subsequent check confirmed the classifier was available again, and the rapid-seeking ONNX test passed.

## 4. Automated Tests — PASS

**GitHub Actions:** [Matchwork Quality Checks, workflow run 40154755292](https://github.com/Kanechiii/matchwork/actions/runs/40154755292)

Passing checks included:

- Production build and lint
- Synthetic generator, replay, and integration verification
- Intelligence regression tests
- Actual ONNX WASM inference

## Reproduction notes

1. Use branch `feature/ai-evidence-resilience` with `npm ci` and `npm run dev`.
2. In the browser, rapidly scrub the replay timeline forward and backward, watching the replay clock, observed events and Analyst evidence IDs. Confirm that an older prediction is not presented as current.
3. In Chrome DevTools, block the `ort.min.mjs` request from the ONNX CDN; disable cache and hard-reload. Observe the AI-unavailable status and verify that replay, statistics, event feed and rule-based recap still function.
4. Remove blocking, hard-reload, confirm HTTP 200 for `ort.min.mjs` and the ONNX WASM file, then verify that the intelligence panel reports `Microsoft ONNX Runtime Web · WASM · Synthetic-trained classifier`.
5. For the local regression checks, run `npm run build`, `npm run lint`, `node scripts/verifyIntelligence.mjs` and `node scripts/verifyOnnxRuntime.mjs`. The ONNX runtime smoke test may require installing the pinned `onnxruntime-web@1.23.2` package for local testing.

## Known Limitations

- React-side request-epoch integration, explicit sampled prediction timestamps and score presentation are assigned to Issue #3 (@Mark-Gerald); PR #8 retains AI-layer safeguards only.
- Manual rapid-seek success does not establish that every possible asynchronous race condition is prevented.
- The initial unavailable state after unblocking the CDN needs further investigation if reproducible.

## Remaining Evidence

- [ ] Attach screenshots of rapid seeking and blocked/recovered ONNX states.
- [ ] Attach local PowerShell test output.
- [ ] Complete and document Fan/Analyst mode testing.

**Status:** Manual QA partially complete. Awaiting remaining screenshots, Fan/Analyst testing and coordinated UI integration before final review.

## Scope clarification — React changes moved to Issue #3

The earlier maintainer UI patch was reverted from this PR because it introduced the React lint warning `react(set-state-in-effect)` and overlaps the UI ownership in #3. The PR no longer changes `src/App.tsx` or includes the UI-only `src/ai/replayPresentation.ts` helper. The model's `asOfSeconds`, score validation, evidence integrity and retryable loader remain in this PR. Mark-Gerald will coordinate React integration and browser acceptance with gyryan. No claim of completed UI acceptance is made.
