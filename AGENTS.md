# Matchwork repository-wide instructions

Apply these instructions throughout the repository, including frontend, backend, scripts, documentation and CI. This is the repository-local adaptation of the Kanechiii Spec Kit governance workflow; it does not install an external CLI.

## Delivery contract

1. Inspect the current branch, requirements, issues, PRs and relevant source before editing. Preserve local changes and historic records.
2. Specify the problem, scope, non-goals and testable acceptance criteria. Plan architecture and security changes before implementation.
3. Implement only authorized work on a focused branch. Use Conventional Commits; use concise sentence-style PR titles without type prefixes or phase numbers.
4. Verify proportionately to risk. Record PASS, FAIL, NOT RUN or BLOCKED using actual evidence. CI is not browser, cloud or security verification.
5. Open a reviewable PR using the repository template. Draft if verification is incomplete. The maintainer must authorize merge, deployment, paid usage and subsequent phases separately.
6. After a user-managed merge, verify the intended base and applicable regression checks. Do not claim the developer's local workspace is synchronized without evidence.

## Non-negotiable architecture and safety

- Keep fictional seeded events authoritative; do not fabricate real data, footage, citations or future-event evidence.
- Preserve replay clock versus model sample clock, rapid-seek integrity, and honest Fan/Analyst evidence.
- ONNX and Foundry failures must leave deterministic replay, statistics, event feed and recaps usable.
- Public narrative requests carry canonical references only. Preserve server-side ledger validation, origin checks, protected routes, Redis quotas and cache partitioning.
- Never expose keys, tokens, environment files or sensitive data. Never increase model spend or alter cloud resources without authorization.
- Retain React/TypeScript/Vite and FastAPI contracts unless an approved architecture change requires otherwise.

## Verification and reporting

Use actual commands in README and quality.yml. For replay/inference changes test sampling boundaries, rapid seeks, restart, speed, CDN failure and recovery. For UI changes test 390/768/1280px, keyboard and reduced motion. For auth, quota or API changes verify denial paths, fail-closed behavior and integration. Keep phase decisions in chat, tests in CI and architecture decisions in docs/architecture.md; preserve historical docs. See CONTRIBUTING.md.
