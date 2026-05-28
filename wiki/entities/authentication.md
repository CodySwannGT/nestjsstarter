---
type: entity
created: 2026-05-28
updated: 2026-05-28
related: [architecture/backend-overview.md, entities/graphql-api.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# Authentication

## What it is
The auth subsystem (`src/auth/`) that authenticates GraphQL operations and enforces authorization
rules on the schema.

## Key points
- **Cognito** (`cognito.service.ts`) is the primary identity provider; `CognitoService` includes a
  region fallback that tolerates an empty `ConfigService` value.
- **Local auth** (`local-auth.service.ts`) provides an offline/dev fallback.
- **JWT auth guard** (`guards/jwt-auth.guard.ts`) protects resolvers.
- **Auth transformer** (`auth.transformer.ts`, `combinedAuthTransformer`) rewrites the GraphQL schema
  to enforce auth rules expressed as schema extensions/directives — auth is declarative on the schema
  rather than scattered through resolvers.
- A provider (`providers/auth-service.provider.ts`) selects the active auth service implementation.

## Related
- `entities/graphql-api.md`
- `architecture/backend-overview.md`

Source: sources/git/2026-05-28-thumbwar-backend-git.md
