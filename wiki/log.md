# Thumbwar Backend Wiki — Log

> Append-only. One row per operation. Operations:
> `INIT, SETUP, INGEST, CREATE, UPDATE, MERGE, DEPRECATE, LINT, QUERY, REBUILD-INDEX`.

| Date | Operation | Target | Notes |
|---|---|---|---|
| 2026-05-28 | SETUP | wiki/ | Initialized Thumbwar Backend Wiki with the lisa-wiki kernel. |
| 2026-05-28 | INGEST | sources/git/ | git connector: 497 commits, 20 merged PRs (HEAD 54a8e80, latest PR #161). Source note written. |
| 2026-05-28 | INGEST | sources/roles/ | roles connector: 7 staff roles / 7 pages ingested. Source note written. |
| 2026-05-28 | CREATE | architecture/backend-overview.md | Synthesized backend architecture from git source note. |
| 2026-05-28 | CREATE | entities/graphql-api.md, entities/authentication.md | Synthesized GraphQL API + auth entities. |
| 2026-05-28 | CREATE | concepts/serverless-deployment.md | Synthesized serverless deployment concept. |
| 2026-05-28 | CREATE | decisions/lisa-governance.md | Synthesized Lisa governance decision. |
| 2026-05-28 | CREATE | open-questions/deployment-mechanism.md | Recorded open question on IaC/deploy mechanism. |
| 2026-05-28 | REBUILD-INDEX | index.md | Added category + sources sections for the full ingest. |
