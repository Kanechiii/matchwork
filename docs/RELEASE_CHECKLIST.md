# Matchwork — Hackathon Release and Submission Checklist

## Purpose

Use this checklist for the final *Inside the Game: Developer Hackathon 2026* submission. It replaces the former GitHub Pages-centric release process; old phase records remain historical.

See the [consolidated project roadmap](PROJECT_PHASE_ROADMAP.md) for Phase 1–10 implementation status and the optional Phase 8 multi-team scope. Do not allow unverified new scope to delay the submission gate.\n\n## Submission Requirements

- [ ] Submit the project through [the official portal](https://aka.ms/insidethegame) before **October 27, 2026, 11:59 PM PDT** (October 28, 2026, 2:59 PM in the Philippines)
- [ ] Provide a public GitHub repository and working, free-to-judge application URL
- [ ] Provide a **public demo video under two minutes** showing the actual application
- [ ] Provide an accurate English project description with Microsoft technology details
- [ ] Confirm rights for all media, team contributions and license decisions
- [ ] Test judge accessibility without exposing backend access tokens

## Deployment and Quality Gates

- [x] Foundry feature PR #13 merged into main and quality CI passed on its head
- [x] Redis atomic attempt reservation succeeded from Azure Container Apps
- [x] Secure app revision 0000005 was provisioned and running at verification
- [x] Browser replay, pause and recap were reported to function
- [ ] Documentation PR #12 updated and merged after fresh CI
- [ ] Run final quality workflow on main after docs merge
- [ ] Recheck secure demo and `/health` in an incognito window
- [ ] Distinguish Foundry model-backed response from rule-based fallback
- [ ] Verify responsive layout and accessibility on desktop and mobile
- [ ] Capture concise screenshots and final code SHA

## Current Live Demo

[Matchwork secure Azure demo](https://matchwork-secure-demo.bluemeadow-70e920b0.japaneast.azurecontainerapps.io/) is the currently verified app. It is hosted on Azure Container Apps in Japan East. An older `matchwork-demo` deployment may exist, but do not use it as the primary submission URL without retesting. See [deployment details](DEPLOYMENT_CURRENT.md).

## Demonstration Storyboard

Target approximately 100–110 seconds to remain safely below the 120-second limit.

| Segment | Content |
| --- | --- |
| 0–12 seconds | Problem and one-sentence Matchwork value proposition |
| 12–30 seconds | Fictional synthetic match, replay and event feed |
| 30–50 seconds | Play/pause/seek and synchronized statistics |
| 50–70 seconds | ONNX model indicator, evidence IDs and appropriate caveats |
| 70–92 seconds | Fan versus Analyst narrative and recap |
| 92–110 seconds | Azure/Foundry architecture, secure budget and final links |

Do not show third-party broadcast footage or disclose model credentials. If no live Foundry call is verified, describe the recap as evidence-linked without claiming a specific model generated that example.

## Risks and Ownership

Maintain one PR per concern and avoid direct pushes to `main`. Any cloud change should be deliberate because the Azure for Students subscription has cost exposure. Azure Cost Management notifications do not establish a spending ceiling. The optional operator session is not a judge sign-in mechanism. The demo video, formal application and contributor/license approvals still require human action.

## Related Documents

[Project README](../README.md) · [Deployment](DEPLOYMENT_CURRENT.md) · [Cost guard](../PHASE7_COST_GUARD.md) · [Documentation index](README.md)
