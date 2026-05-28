---
type: decision
created: 2026-05-28
updated: 2026-05-28
related: [architecture/backend-overview.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# Lisa-governed quality regime

## Context
The git history shows the repository is governed by `@codyswann/lisa`, applied as templates and
upgraded continuously (a long sequence of `chore: update @codyswann/lisa to ...` commits up through
2.62.1, PR #161). Much of the engineering churn is Lisa-driven quality tightening rather than feature
work.

## Decision
Adopt Lisa as the source of governance for this backend: ESLint thresholds (notably
`maxLinesPerFunction`, repeatedly reduced from 75 → 30), test-coverage thresholds (ratcheted upward
over time toward statements/branches/functions/lines ~90%), security/audit policy (npm audit GHSA
exclusions, dependency overrides such as `fast-xml-parser` and `axios`), and CI workflows are managed
through Lisa templates.

## Consequences
- Routine PRs bump the Lisa dependency and re-apply templates; coverage/complexity thresholds only
  ratchet tighter.
- Functional-programming lint rules (e.g. `functional/no-let`) are enforced; documented local
  disables exist where unavoidable (Lambda warm-start cache).
- New work must clear the current coverage and complexity gates.

## Status
accepted

Source: sources/git/2026-05-28-thumbwar-backend-git.md
