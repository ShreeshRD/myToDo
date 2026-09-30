# Plan & Analysis

## Purpose

Own project planning documents, flow analysis, and implementation plans. These are living artifacts that guide development work.

## Ownership

All files under `plan/`.

## Local Contracts

- Plans must reference specific files and line numbers where changes are needed
- Flow analysis must map user-visible symptoms to code-level failure points
- Keep plans scoped and actionable; avoid vague goals

## Work Guidance

- New plans: create in `plan/` with a descriptive name and `---` frontmatter
- Cross-reference existing plans to avoid duplicate work
- Delete obsolete plans; do not leave stale ones

## Verification

None yet.

## Plan Document Index

| Document | Purpose |
|---|---|
| `project-overview.md` | What the app does, architecture, and how to run/test every service |
| `design-system.md` | Visual design tokens and component rules shared by the web app and the Android app |
| `agent-native.md` | Agent-Native conversion plan |
| `backend-endpoints.md` | Backend REST endpoints inventory |
| `frontend-flows.md` | Frontend page views and API integrations inventory |
| `actions-candidates.md` | Candidate Agent-Native Actions schemas and mappings |
| `runtime-db.md` | Database boundary decision: isolated SQLite for agent-app vs Spring Boot DB |
| `agent-workflows.md` | Agent-native workflow descriptions and confirmation rules |
| `open-items.md` | Remaining manual verification, known failures, and follow-up work |

