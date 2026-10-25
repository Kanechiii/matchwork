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

- The `App.tsx` integration of the request-epoch guard and explicit prediction as-of timestamp is still pending coordination with @Mark-Gerald.
- Manual rapid-seek success does not establish that every possible asynchronous race condition is prevented.
- The initial unavailable state after unblocking the CDN needs further investigation if reproducible.

## Remaining Evidence

- [ ] Attach screenshots of rapid seeking and blocked/recovered ONNX states.
- [ ] Attach local PowerShell test output.
- [ ] Complete and document Fan/Analyst mode testing.

**Status:** Manual QA partially complete. Awaiting remaining screenshots, Fan/Analyst testing and coordinated UI integration before final review.

## Maintainer correction — sampled inference/UI integration

The project lead applied a narrow shared-`App.tsx` correction for Issue #4 (coordinate any further UI edits with @Mark-Gerald in #3):
- `src/ai/replayPresentation.ts` supplies 15-second sampling and a pure display selector. It rejects a prediction whose `asOfSeconds` disagrees with the active sample, so stale Analyst model scores cannot appear.
- `src/App.tsx` uses one sampled timestamp for ONNX inference, evidence counts, explanations and Analyst scores. UI explicitly displays both **AI as of** and **replay** times. The scoreboard, match statistics, event feed and rule recap still update at the **live replay time**.
- The UI connects `createPredictionRequestGate()` to React effect teardown and new requests. Results from superseded requests must not overwrite state after fast seeking. When a sample changes, its status becomes loading until an answer belongs to that sample.
- A **Retry AI** control reruns failed attempts while paused (and while playing) without changing the replay clock.
- `scripts/verifyIntelligence.mjs` tests 00:14→00:15→00:16→00:29→00:30, rewind, stale-score rejection, invalid clocks and the existing failure tests.

**Evidence standard:** These are source and automated regression changes, not independently witnessed Chrome screenshots. Original manual QA screenshots, terminal output and complete Fan/Analyst verification remain to be supplied. GitHub CI result should be linked from the latest commit rather than an earlier run.

### Updated manual browser acceptance
1. Seek to 00:16: show **AI as of 00:15** and **replay 00:16**; when ready, the model scores and evidence must refer to **00:15**, while replay stats and recap refer to **00:16**.
2. Seek 00:29 → 00:30 → 00:15 quickly: never show model scores belonging to a different 15-second sample. Repeat at half-time and full-time.
3. In Fan and Analyst mode, switch team focus; no misleading model state or stale score text.
4. Block `ort.min.mjs`, hard-refresh, observe honest AI unavailable and working deterministic panels; unblock, click **Retry AI**, and confirm eventual recovery or capture the residual browser error.
5. Attach screenshots and local command output; document remaining issues.
