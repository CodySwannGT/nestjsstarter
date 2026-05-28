---
type: architecture
created: 2026-05-28
updated: 2026-05-28
related: [entities/graphql-api.md, entities/authentication.md, concepts/serverless-deployment.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# Thumbwar Backend Architecture

## Overview
The Thumbwar backend is a NestJS application exposing a GraphQL API via the Apollo driver. It is
packaged for serverless deployment on AWS Lambda (entry point `src/main.ts`, using
`@vendia/serverless-express` with warm-start server caching). AWS X-Ray tracing is initialized first,
before any HTTP-using imports.

## Components
- **Root module** (`src/app.module.ts`): wires the global `ConfigModule`, the GraphQL module (Apollo
  driver, code-first auto schema, schema-directive auth transform, DataLoader-backed request
  context), and the feature modules below. Registers `ComplexityPlugin` and `OperationLoggingPlugin`
  as Apollo plugins.
- **Auth** (`src/auth/`): Cognito-backed authentication with a local-auth fallback for offline work,
  a JWT auth guard, and a schema auth transformer (`combinedAuthTransformer`) that enforces auth
  rules declared as GraphQL schema extensions/directives.
- **Database** (`src/database/`): TypeORM with entities and migrations, an RDS IAM-auth token signer
  (`rds-signer.ts`), and an X-Ray-instrumented TypeORM query logger.
- **DataLoader** (`src/data-loader/`): per-request DataLoaders injected into the GraphQL context to
  batch and de-duplicate database access.
- **Subscriptions / WebSocket** (`src/subscription/`, `src/websocket/`): GraphQL subscriptions over a
  pub/sub layer plus WebSocket handlers and a connection authorizer.
- **Valkey** (`src/valkey/`): Valkey (Redis-compatible) caching/service layer.
- **Health** (`src/health/`): health-check endpoints.
- **Tracing** (`src/tracing/`): AWS X-Ray initialization and instrumentation.

## Data flow
Client → API Gateway/Lambda (`main.ts` handler) → NestJS/Apollo → resolvers (auth enforced via schema
transform + JWT guard) → DataLoaders → TypeORM/RDS, with Valkey caching and GraphQL subscriptions
delivered over WebSocket. X-Ray traces span the request including TypeORM queries.

## Constraints & decisions
- Lambda warm-start requires a cached server instance (`functional/no-let` is locally disabled for the
  cache).
- X-Ray must initialize before HTTP-using imports.
- See `decisions/lisa-governance.md` for the Lisa-managed quality regime.

Source: sources/git/2026-05-28-thumbwar-backend-git.md
