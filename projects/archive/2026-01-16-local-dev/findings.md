# Findings

Learnings and insights discovered during project implementation.

## Planning Phase

### Architecture Simplification
- **Finding**: The original brief proposed a separate WebSocket server on port 3001, but Q3's answer ("follow NestJS/GraphQL community conventions") led to using NestJS's built-in graphql-ws support on the same port as HTTP.
- **Impact**: Simplified implementation by removing need for `LocalWebSocketService` and `IWebSocketGateway` interface. The facade pattern is only needed for PubSub.

### Existing Patterns
- **Finding**: The auth module's facade pattern (`AuthService` vs `LocalAuthService`) provides a clear template for implementing PubSub selection.
- **Impact**: Reduced design effort and ensures consistency across the codebase.

## Implementation Findings

### Task 1: Local Entry Point
- **Finding**: The local entry point (`main-local.ts`) is significantly simpler than the Lambda entry point (`main.ts`) because it does not need warm-start caching or serverless-express wrapping.
- **Impact**: Clean separation of concerns - local development uses standard NestJS patterns while production maintains Lambda optimizations.
- **Note**: X-Ray initialization is intentionally omitted from `main-local.ts` since the tracing module already handles `IS_OFFLINE=true` gracefully.

### Task 2: LocalPubSub Service
- **Finding**: graphql-subscriptions v3 renamed `asyncIterator` to `asyncIterableIterator`, breaking backward compatibility with ValkeyPubSub's interface.
- **Impact**: LocalPubSub requires a wrapper method `asyncIterator()` that calls `asyncIterableIterator()` internally to maintain ValkeyPubSub interface parity.
- **Testing Note**: When testing asyncIterator with EventEmitter-based PubSub, calling `iterator.next()` before `publish()` avoids race conditions. Use `setImmediate` to ensure subscription is established before publishing events.

### Task 8: Integration Verification
- **Finding**: Docker is not available in CI/CD environments, so full Docker Compose integration testing must be done manually in a developer's local environment.
- **Quality Checks Verified**: All quality checks pass without Docker:
  - `bun run lint` - passed (no errors)
  - `bun run build` - passed (TypeScript type check)
  - `bun run test` - passed (all tests including LocalPubSub tests)
  - `bun run format:check` - passed (all files properly formatted)
- **Docker Configuration Verified**: `docker-compose.yml` and `Dockerfile.local` exist and are correctly configured with:
  - Backend service building from `Dockerfile.local`
  - Port 3000 exposed for HTTP/GraphQL
  - Environment variables for `IS_OFFLINE`, database, and Valkey
  - Volume mount for hot reload (`./src:/app/src:ro`)
  - Health check dependencies on postgres and valkey services
- **Manual Testing Required**: Full integration (GraphQL endpoint response, WebSocket subscriptions) requires manual verification in an environment with Docker installed.
