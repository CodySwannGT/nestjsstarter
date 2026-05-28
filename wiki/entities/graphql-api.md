---
type: entity
created: 2026-05-28
updated: 2026-05-28
related: [architecture/backend-overview.md]
sources: [sources/git/2026-05-28-thumbwar-backend-git.md]
---

# GraphQL API

## What it is
The public surface of the Thumbwar backend, served through `@nestjs/graphql` with the Apollo driver
(`ApolloDriver`). Code-first schema generation is used; in offline mode the schema is emitted to
`src/schema.gql`, otherwise generated in memory. Schema is sorted; Playground is disabled but
introspection is enabled.

## Key points
- **Auth enforcement** runs as a schema transform (`combinedAuthTransformer`) applied via
  `transformSchema`, enforcing rules declared as GraphQL extensions/directives.
- **Request context** carries `req`, `res`, and per-request DataLoaders.
- **Apollo plugins**: `ComplexityPlugin` (query complexity limiting) and `OperationLoggingPlugin`
  (operation logging) are registered as providers.
- **Subscriptions** are supported through the subscription module and a pub/sub layer over WebSocket.

## Related
- `architecture/backend-overview.md`
- `entities/authentication.md`

Source: sources/git/2026-05-28-thumbwar-backend-git.md
