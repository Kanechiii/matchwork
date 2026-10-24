# Matchwork — Hackathon release and submission checklist

## Official deadline and requirements
- **Submission cutoff:** October 27, 2026, 11:59 PM Pacific Time (October 28, 2026, 2:59 PM Philippines). Leave margin for timezone, encoding and upload failures.
- Submit on https://aka.ms/insidethegame.
- A short project pitch describing the problem, approach, and Microsoft technology.
- A **public video shorter than two minutes** showing the software functioning on its intended device. Host on YouTube, Vimeo, Facebook Video, or Youku.
- A public GitHub repository: https://github.com/Kanechiii/matchwork
- A free, accessible working-project link for judges through the judging period. No account required for the planned demo.
- Original content only; football events and team names are fictional. Do not include unlicensed broadcast footage, third-party logos, music or protected footage.
- English submission content and testing instructions.
- License and team contributor permissions must be decided by humans before final submission; no license is assumed here.

## Intended release URL (NOT published yet)
https://kanechiii.github.io/matchwork/

Publishing is intentionally **manual-only**. A code merge does not deploy anything.

## Pre-release gate
1. Merge the validated release-readiness PR to main after approval.
2. Confirm GitHub Actions quality checks pass on main.
3. Review security permissions: publishing is from main only; Pages workflow grants read-only build permissions and Pages deployment permissions only in the deploy job.
4. In GitHub Settings → Pages choose **GitHub Actions** as Source. Verify the `github-pages` environment restricts deployment to `main` and apply approval protections where available.
5. Review model transparency and confirm all media, names, and icons are properly licensed.
6. Obtain explicit project-owner approval **before** clicking Run workflow.

## Publication steps (after explicit authorization)
1. Open repository → Actions → **Publish Matchwork to GitHub Pages**.
2. Use **Run workflow**, choose `main`, then review and run.
3. Inspect deployment result and final URL; confirm no security warnings.
4. Open the public site in private/incognito browsing, mobile viewport and desktop viewport.
5. Test replay play/pause/seek/restart, 1×/4×/16× speed, Fan/Analyst views, team focus, model status and error fallback, event evidence, recaps, and keyboard interaction.
6. On a fresh browser check DevTools console and Network; reject deployment if JS, CSS, favicon, or ONNX CDN resources cannot load.
7. Retest without a network connection: UI should clearly distinguish unavailable inference rather than invent predictions.
8. Record the exact demo URL and test date.

## Demo storyboard (target ~100–110 seconds)
- 0–12s: Problem: football context beyond the scoreboard; Matchwork tagline.
- 12–28s: Fictional dataset, event replay, time-indexed statistics.
- 28–46s: Seek and play; show score, stats and evidence updating.
- 46–67s: Microsoft ONNX Runtime Web synthetic-trained classifier and cautious scores.
- 67–85s: Fan view vs Analyst view, team focus, and traceable source event IDs.
- 85–102s: Automatically generated synthetic-event recap and explainability.
- 102–110s: Public GitHub link, application link, concise limitation statement.

Use screen recording of the running application and narration. Avoid copyrighted footage or music. Video MUST be **under 120 seconds**, not exactly 120 seconds.

## Submission pitch draft
**Matchwork — The game, understood.** Matchwork turns reproducible, synthetic football events into live replay statistics, contextual explanations and accessible match stories. The web experience uses Microsoft ONNX Runtime Web for an illustrative in-browser match-state classifier, while transparent, evidence-linked event statistics explain the context for fans and analysts. Two viewing modes and team focus demonstrate how a single event stream supports multiple audiences. Its labels and match data are synthetic; model scores are not validated real-world football predictions. The open-source tooling runs without paid cloud dependencies.

## Team ownership and review
- **Project lead:** owns release readiness, GitHub Pages settings, final PR merge, demo capture, eligibility checks, team permissions and hackathon submission.
- **Collaborator 1 (UI, overlay, accessibility):** polish typography, mobile/tablet layout, keyboard usability, optional synchronized presentation overlay; avoid modifying model/training files. Submit a PR against main.
- **Collaborator 2 (AI evidence and reliability):** validate feature handling, strengthen explanation groundedness, add regression tests and browser runtime diagnostics; avoid unrelated style changes. Submit a PR against main.
- Verify that invitations have actually been accepted in repository Settings → Collaborators. Do not assume invitation equals access. Assign named issue owners after confirmation.
- Keep `main` stable; one branch/PR per issue. No direct pushes to main. Do not delete collaborators' branches without approval.

## Outstanding risks
- Phase 3 ONNX Runtime Web is CDN-loaded; public site requires CDN access. Real browser smoke testing is still required.
- Model is trained on handcrafted synthetic state templates and not externally validated on authentic football data.
- MIT license awaits team agreement. Never publish a LICENSE file before consensus.
- Demo video, live public URL, submission form, and final judging accessibility are not completed by the repo workflow.
- The official rules describe five judging dimensions, each weighted 20%, including agentic design; do not claim multi-agent orchestration unless it is genuinely implemented and verified.
