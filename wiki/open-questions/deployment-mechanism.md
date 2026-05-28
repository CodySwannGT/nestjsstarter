---
type: open-question
created: 2026-05-28
updated: 2026-05-28
related: [concepts/serverless-deployment.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# How is the backend deployed to AWS?

## Question
The app is built for AWS Lambda (`@vendia/serverless-express`), but the git-history ingest did not
surface the infrastructure-as-code mechanism (Serverless Framework, CDK, SAM, or Terraform) or the
deploy pipeline. Which tool provisions the Lambda, API Gateway, RDS, and Valkey resources, and what
triggers a deploy?

## What we know
- `src/main.ts` is a Lambda handler with warm-start caching.
- Database uses an RDS IAM token signer, implying RDS with IAM auth.
- A Valkey (Redis-compatible) service is present, implying an ElastiCache/Valkey resource.

## Status
open — resolve via the deploy/IaC config (e.g. `serverless.yml`, `cdk/`) in a future ingest.

Source: sources/git/2026-05-28-thumbwar-backend-git.md
