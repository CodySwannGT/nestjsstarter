---
type: concept
created: 2026-05-28
updated: 2026-05-28
related: [architecture/backend-overview.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# Serverless Deployment

## Definition
The backend runs as an AWS Lambda function rather than a long-lived server. `src/main.ts` is the
Lambda handler, adapting the NestJS/Express app through `@vendia/serverless-express`.

## Key points
- A closure-based server getter caches the initialized NestJS app across warm invocations to avoid
  re-bootstrapping on every request.
- AWS X-Ray is initialized at the very top of `main.ts`, before any HTTP-using imports, so all
  downstream calls (including TypeORM queries via the X-Ray logger) are traced.
- CORS is configured permissively (`origin: "*"`) at app creation.
- Database access uses an RDS IAM token signer (`database/rds-signer.ts`) rather than static
  credentials.

## Evidence
Source: sources/git/2026-05-28-thumbwar-backend-git.md

## Open questions
- Exact deployment/IaC mechanism (Serverless Framework vs. CDK) — see `open-questions/`.
