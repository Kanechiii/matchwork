# Matchwork — Documentation Standards

## Purpose

Keep Matchwork approachable for contributors and judges without obscuring technical limits. This guide applies to new Markdown files and substantive revisions; historical snapshots can remain unchanged where changing them would destroy their original context.

## Naming and Structure

Use one descriptive H1 per file. Prefer title case: `# Matchwork — Topic` for current project guides and `# Phase N — Topic` for historical milestone records. Use uppercase snake case for existing phase documents only where renaming would break links; use descriptive file names for new guides.

Preferred section order:

1. **Purpose** — what the document answers and who should read it.
2. **Current Status** — verified, implemented but opt-in, historical, or pending.
3. **Design / Procedure** — concise architectural explanation and executable steps.
4. **Verification** — exact tests, evidence and observable outcomes.
5. **Risks / Limitations** — billing, security and deployment boundaries.
6. **Acceptance Checklist** — `- [x]` only for actually verified items; `- [ ]` otherwise.
7. **Related Documents** — relative links to canonical sources.

Do not assert that CI tests prove production behavior. A running replay or rule-based recap does not prove a live Foundry request. A successful Redis reservation does not prove a monetary spending cap.

## Markdown Conventions

- Use relative links for repository-local files; use stable absolute URLs for deployed apps.
- Keep commands copyable, label shells (`powershell`, `bash`, `python`) and separate commands that run inside Container Apps from local PowerShell commands.
- Put secrets in Container Apps secrets / Key Vault. Never write secret values, direct access keys or bearer tokens in documentation.
- Prefer concise tables for settings and status; checklists for explicitly testable acceptance gates.
- Preserve evidence provenance: user-reported browser check, Azure CLI output, unit test, CI workflow or direct authenticated integration test.
- Document opt-in flags and fail-closed behavior; do not turn an experimental feature into a claimed default.
- Avoid moving older phase files unless all inbound links, workflows and collaborator references are checked.

## Review Checklist

- [ ] H1 title and section naming are consistent
- [ ] Setup commands and relative links work from repository root
- [ ] Current vs historical and verified vs pending facts are clear
- [ ] Security and cost caveats are preserved
- [ ] Every completed checkbox has evidence
- [ ] README, deployment and release documents do not contradict one another
