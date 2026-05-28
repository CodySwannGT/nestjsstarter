---
date: 2026-01-16T12:45:00-05:00
status: complete
last_updated: 2026-01-16
---

# Research

## Summary

This research documents the existing codebase architecture for implementing a local development environment (`main-local.ts`) with Docker Compose integration. The project requires creating an alternate NestJS entry point, implementing WebSocket and PubSub facade patterns for local development, and integrating with Docker Compose.

Key findings:
1. **Facade Pattern**: The auth module provides a well-established pattern for environment-based service selection (`AuthService` vs `LocalAuthService`) that can be replicated for WebSocket and PubSub
2. **X-Ray Tracing**: Already handles `IS_OFFLINE=true` gracefully with early return
3. **Docker Compose**: Existing configuration provides postgres and valkey services; needs backend service addition
4. **WebSocket Architecture**: Currently Lambda-based handlers, not NestJS modules; local development requires a different approach
5. **PubSub**: `ValkeyPubSub` is a custom implementation for serverless, not extending `PubSubEngine`; `LocalPubSub` should use `graphql-subscriptions` library

## Detailed Findings

### Entry Point Architecture

The current Lambda entry point (`src/main.ts:1-67`) demonstrates the pattern for creating a NestJS application:

- **X-Ray First**: Imports `initializeXRay()` before any other imports (line 2-3)
- **Serverless Express Wrapper**: Uses `@vendia/serverless-express` to wrap NestJS for Lambda's event/context model
- **Warm-Start Caching**: Uses closure pattern (`createServerGetter()`) to cache the server instance across Lambda invocations
- **AppModule**: Uses the same `AppModule` that will be shared with local development

```typescript
// From src/main.ts - key bootstrap pattern
const nestApp = await NestFactory.create(AppModule, {
  cors: {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
});
```

### X-Ray Tracing (Already Handles Offline Mode)

The tracing module (`src/tracing/xray.config.ts:42-55`) already handles offline mode:

```typescript
// Already implemented - no changes needed
if (isOffline) {
  initState.initialized = true;
  logger.log("X-Ray disabled in offline mode");
  return;
}
```

Key locations:
- `src/tracing/xray.config.ts:42-85` - Main initialization function
- `src/tracing/index.ts` - Barrel export for `initializeXRay`

### Auth Facade Pattern (Template for WebSocket/PubSub)

The auth module provides the established pattern to replicate:

**1. Interface Definition** (`src/auth/interfaces/auth-service.interface.ts:23-65`)
```typescript
export interface IAuthService {
  signIn(input: SignInInput): Promise<SignInResult>;
  confirmSignIn(input: ConfirmSignInInput, request?: Request): Promise<ConfirmSignInResult>;
  // ... other methods
}
```

**2. Injection Token** (`src/auth/providers/auth-service.provider.ts:17`)
```typescript
export const AUTH_SERVICE = "AUTH_SERVICE";
```

**3. Factory Provider** (`src/auth/providers/auth-service.provider.ts:23-34`)
```typescript
export const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (
    configService: ConfigService,
    authService: AuthService,
    localAuthService: LocalAuthService
  ): IAuthService => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
```

**4. Module Wiring** (`src/auth/auth.module.ts:28-47`)
- Imports `ConfigModule`
- Provides both implementations + factory provider
- Exports the injection token

### WebSocket Architecture (Lambda Handlers)

Current WebSocket implementation is Lambda-based, not NestJS module-based:

**Lambda Handlers** (`src/websocket/handlers/`):
- `connect.handler.ts` - Stores connection in Valkey on `$connect`
- `disconnect.handler.ts` - Removes connection from Valkey on `$disconnect`
- `default.handler.ts` - Handles GraphQL-WS protocol messages

**GraphQL-WS Protocol Messages** handled in `default.handler.ts:138-190`:
- `connection_init` -> responds with `connection_ack`
- `ping` -> responds with `pong`
- `subscribe` -> registers subscription in Valkey
- `complete` -> unregisters subscription from Valkey

**Shared Clients** (`src/websocket/shared/`):
- `api-gateway-client.ts` - Sends messages via API Gateway Management API
- `valkey-client.ts` - Connection and subscription storage in Valkey

**Key Insight**: For local development, a WebSocket server using the `ws` package needs to implement the same GraphQL-WS protocol handling that `default.handler.ts` provides.

### Subscription/PubSub Architecture

**Current Module** (`src/subscription/subscription.module.ts:12-37`):
```typescript
export const PUB_SUB = "PUB_SUB";

@Global()
@Module({
  imports: [ValkeyModule],
  providers: [
    {
      provide: PUB_SUB,
      useFactory: (valkeyService: ValkeyService) => {
        return new ValkeyPubSub(valkeyService);
      },
      inject: [ValkeyService],
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
```

**ValkeyPubSub** (`src/subscription/pubsub/valkey-pubsub.ts:46-234`):
- Custom implementation for serverless
- Does NOT extend `PubSubEngine` from `graphql-subscriptions`
- Methods: `publish()`, `publishCreated()`, `publishUpdated()`, `publishDeleted()`, `asyncIterator()`
- `asyncIterator()` returns a never-resolving promise (serverless mode)
- Uses API Gateway Management API to push messages to clients

**SubscriptionFilters Interface** (`src/valkey/valkey.interface.ts:54-61`):
```typescript
export interface SubscriptionFilters {
  resourceId?: string;
  ownerId?: string;
  organizationId?: string;
}
```

**Base Subscription Resolver** (`src/subscription/base-subscription.resolver.ts:35-115`):
- Abstract class for extending subscription resolvers
- Provides `getCreatedTrigger()`, `getUpdatedTrigger()`, `getDeletedTrigger()`
- Provides `publishCreated()`, `publishUpdated()`, `publishDeleted()`

### Docker Compose Configuration

**Existing Configuration** (`docker-compose.yml:1-49`):
```yaml
services:
  valkey:
    image: valkey/valkey:8-alpine
    ports:
      - '6379:6379'
    # ...
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: thumbwar
      POSTGRES_PASSWORD: thumbwar_local
      POSTGRES_DB: thumbwar
    # ...
networks:
  thumbwar-network:
    driver: bridge
volumes:
  valkey_data:
  postgres_data:
```

**K6 Load Testing** (`docker-compose.k6.yml`): Separate compose file for load testing, not relevant to local dev.

### Configuration Management

**Configuration Factory** (`src/config/configuration.ts:133-169`):
- Central source of all environment variable access
- Provides type-safe `Configuration` interface
- `getStandaloneConfig()` for Lambda handlers outside NestJS context
- `isLocalEnvironment()` checks `IS_OFFLINE` or `NODE_ENV=test`

**Key Environment Variables**:
- `IS_OFFLINE` - Set to "true" for local development
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `VALKEY_HOST`, `VALKEY_PORT`
- `WEBSOCKET_API_ENDPOINT` - Only used in Lambda mode

### Serverless Configuration

**serverless.yml** shows WebSocket handlers are Lambda functions:
```yaml
functions:
  wsConnect:
    handler: src/websocket/handlers/index.connect
    events:
      - websocket:
          route: $connect
          authorizer:
            name: wsAuthorizer
  wsDisconnect:
    handler: src/websocket/handlers/index.disconnect
    events:
      - websocket:
          route: $disconnect
  wsDefault:
    handler: src/websocket/handlers/index.defaultHandler
    events:
      - websocket:
          route: $default
```

## Code References

- `src/main.ts:1-67` - Lambda entry point (template for main-local.ts bootstrap)
- `src/tracing/xray.config.ts:42-85` - X-Ray initialization with offline handling
- `src/auth/interfaces/auth-service.interface.ts` - Interface pattern to replicate
- `src/auth/providers/auth-service.provider.ts` - Factory provider pattern to replicate
- `src/auth/services/local-auth.service.ts` - Local implementation example
- `src/auth/auth.module.ts:28-47` - Module wiring pattern
- `src/subscription/subscription.module.ts:12-37` - Current PubSub module (needs refactoring)
- `src/subscription/pubsub/valkey-pubsub.ts:46-234` - Serverless PubSub implementation
- `src/websocket/handlers/default.handler.ts:109-204` - GraphQL-WS protocol handling
- `src/websocket/shared/valkey-client.ts` - Valkey client for connections/subscriptions
- `src/config/configuration.ts:133-169` - Configuration factory
- `docker-compose.yml` - Existing Docker Compose with postgres/valkey

## Architecture Documentation

### NestJS Module Patterns

The codebase follows standard NestJS patterns:
- **Global Modules**: `ValkeyModule`, `SubscriptionModule` marked with `@Global()` for app-wide availability
- **ConfigModule**: Custom wrapper at `src/config/config.module.ts`
- **Async Factory Providers**: Used for services requiring runtime configuration

### Dependency Injection Pattern

Factory providers inject `ConfigService` to determine which implementation to use:
```typescript
useFactory: (configService: ConfigService, ...services) => {
  const isOffline = configService.get<string>("IS_OFFLINE") === "true";
  return isOffline ? localService : productionService;
}
```

### Package Manager

The project uses **bun** (see `package.json` engines field):
```json
"engines": {
  "npm": "please-use-bun",
  "yarn": "please-use-bun",
  "bun": ">= 1.3.5"
}
```

## Testing Patterns

### Unit Test Patterns
- **Location**: `src/**/*.test.ts`
- **Framework**: Jest with ts-jest
- **Example to follow**: `src/auth/providers/auth-service.provider.test.ts`
- **Conventions**:
  - Use `@nestjs/testing` TestingModule for service tests
  - Mock dependencies with `jest.fn()` and `jest.Mock`
  - File preamble with `@file`, `@description`, `@module` JSDoc
  - Test context interfaces for organizing test state
  - `beforeEach` for test setup with module compilation
  - `eslint-disable functional/no-let` comment for Jest variables

### Integration Test Patterns
- **Location**: `src/**/*.integration.test.ts`
- **Example to follow**: `src/subscription/subscription.integration.test.ts`
- **Conventions**:
  - Skip tests if external dependencies unavailable (e.g., Valkey)
  - Cleanup test data in `afterAll` or `beforeAll`
  - Test context interface with module, services
  - Require running `docker-compose up -d` before tests
  - Run separately via `bun run test:integration`

### Provider Test Pattern
Example from `src/auth/providers/auth-service.provider.test.ts:35-89`:
```typescript
describe("useFactory", () => {
  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  it('should return LocalAuthService when IS_OFFLINE="true"', () => {
    (mockConfigService.get as jest.Mock).mockReturnValue("true");
    const result = authServiceProvider.useFactory(
      mockConfigService,
      mockAuthService,
      mockLocalAuthService
    );
    expect(result).toBe(mockLocalAuthService);
  });
});
```

## Documentation Patterns

### JSDoc Conventions
- **Style**: TypeScript JSDoc with explicit descriptions
- **Example**: `src/auth/services/local-auth.service.ts:1-5`
- **Required tags**:
  - `@file` - File name
  - `@description` - Brief description of the file's purpose
  - `@module` - Module name
  - `@param` - Function parameters with descriptions
  - `@returns` - Return value description
  - `@remarks` - Implementation details, edge cases, usage notes
  - `@example` - Code examples (optional, for complex APIs)

### File Preamble Pattern
```typescript
/**
 * @file local-auth.service.ts
 * @description Local authentication service for development without Cognito
 * @module auth
 */
```

### Function Documentation Pattern
```typescript
/**
 * Initiates sign-in process by creating a local session
 * @param input - Sign-in input with identifier
 * @returns Sign-in result with challenge data
 */
async signIn(input: SignInInput): Promise<SignInResult> { ... }
```

### Database Comments (Backend Only)
- **Convention**: TypeORM entities use JSDoc for column documentation
- **Example**: `src/database/entities/timestamped.entity.ts`
- **Required for**: New entities, new columns

### GraphQL Descriptions (Backend Only)
- **Convention**: Use `@Field()` decorator `description` option
- **Example**: Type definitions in resolvers
- **Required for**: All public API types and fields

## Open Questions

### Q1: WebSocket Library Choice
**Question**: Should the local WebSocket server use the `ws` package directly (as specified in brief) or a NestJS-native approach?
**Context**: The brief specifies adding `ws` package, but `@nestjs/websockets` is explicitly excluded in `serverless.yml`. The brief's `LocalWebSocketService` uses `ws.WebSocketServer` directly with NestJS lifecycle hooks.
**Impact**: Affects package installation and service implementation approach
**Answer**: Use NestJS-native approach as long as it fits the facade pattern established in the auth module.

### Q2: LocalPubSub Interface Compatibility
**Question**: Should `LocalPubSub` extend `PubSub` from `graphql-subscriptions` (as shown in brief) or implement a custom interface matching `ValkeyPubSub`?
**Context**: The brief shows `LocalPubSub extends PubSub`, but `ValkeyPubSub` is a custom class with different method signatures (e.g., `publishCreated(resourceType, data, filters)` vs standard `publish(triggerName, payload)`). The `BaseSubscriptionResolver` currently depends on `ValkeyPubSub` type directly.
**Impact**: Affects interface design, type compatibility with existing resolvers, and whether standard `graphql-subscriptions` patterns work
**Answer**: Use whatever approach works best for the facade pattern - prioritize consistency with the established auth module pattern.

### Q3: GraphQL Subscriptions Endpoint
**Question**: Should the local WebSocket server handle GraphQL subscriptions via a separate port (3001 as in brief) or on the same port as HTTP (/graphql endpoint)?
**Context**: NestJS GraphQL module supports built-in subscription handling via `subscriptions: { 'graphql-ws': true }` which serves WebSocket on the same port as HTTP. The brief proposes a separate WebSocket server on port 3001.
**Impact**: Affects client configuration, CORS handling, and whether NestJS native subscription support can be leveraged
**Answer**: Use best practices - follow NestJS and GraphQL community conventions for subscription endpoint configuration.

### Q4: Hot Reload Implementation
**Question**: Is hot reload (HMR) required for the initial implementation or is it out of scope?
**Context**: The brief lists "Hot reload support for faster development iteration" as a non-functional requirement, but also lists "Hot module replacement (HMR)" under "Future Enhancements (Out of Scope)".
**Impact**: Affects entry point implementation and Docker Compose volume configuration
**Answer**: Required - hot reload support should be included in the initial implementation.

## External Resources

- [graphql-subscriptions npm package](https://www.npmjs.com/package/graphql-subscriptions) - In-memory PubSub implementation for local development
- [NestJS GraphQL Subscriptions Documentation](https://docs.nestjs.com/graphql/subscriptions) - Official NestJS subscription guide
- [Apollo Server Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions) - Apollo subscription patterns
- [graphql-ws Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md) - WebSocket subprotocol specification
