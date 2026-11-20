# Contributing to Matchwork

Follow [AGENTS.md](AGENTS.md) for the repository-wide Spec Kit adaptation and [architecture](docs/architecture.md) for protected boundaries.

## Specification-driven workflow

| Step | Expected output |
| --- | --- |
| Specify | Problem, scope, non-goals, testable acceptance criteria |
| Plan | Source audit, affected contracts, risk and verification plan |
| Implement | Focused branch, small conventional commits |
| Verify | Actual checks and gaps; latest-head CI |
| Review | Sentence-title PR, relevant labels and verified issue links |
| Integrate | Maintainer-approved merge, post-merge verification |

Use existing issues instead of duplicates. Keep issue titles conventional-style, with Problem, Objective, Scope and 3–6 broad acceptance criteria. Keep phase numbering in chat, not new issue or PR metadata.

## Naming

| Artifact | Example |
| --- | --- |
| Branch | `docs/repository-governance` |
| PR | Improve repository navigation and development governance |
| Commit | `docs(readme): improve repository navigation` |
| Squash subject | `docs: establish repository governance` |

PRs use Summary, Changes, Scope and Purpose; add Related Issues only for verified relevant links. Use 3–4 relevant lowercase single-word labels where available. Preserve historical PR bodies and merge records. Provide verification evidence in CI and review discussion, not a fabricated checklist.

## Quality gates

Low risk: review diff, links and documentation rendering. Moderate: build, lint, relevant unit/integration plus browser/error paths. High: real authorization, data integrity, security and failure-path regression. Critical: additionally verify recovery and rollback. See [README verification](README.md#verification) and [CI](.github/workflows/quality.yml).

Never self-merge, deploy, enable paid usage or rewrite shared commit history without explicit approval. Keep the original hackathon submission snapshot identifiable; do not represent later changes as submitted work.
