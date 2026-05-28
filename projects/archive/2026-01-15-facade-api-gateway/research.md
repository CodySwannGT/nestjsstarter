---
date: 2026-01-15T20:57:44Z
status: complete
last_updated: 2026-01-15
---

# Research: API Gateway WebSocket Facade

## Summary

This research documents the existing codebase patterns and architecture relevant to implementing a local WebSocket server facade for GraphQL subscriptions. The project uses NestJS with a serverless deployment model (AWS Lambda + API Gateway WebSocket). The key patterns to follow are:

1. **Facade pattern** established in `src/auth/providers/auth-service.provider.ts`
2. **ValkeyPubSub** as the central subscription delivery mechanism
3. **GraphQL-WS protocol** handling in Lambda WebSocket handlers
4. **Configuration via namespaces** in `src/config/configuration.ts`

## Detailed Findings

### 1. Existing Facade Pattern (Auth Service)

The auth service demonstrates the exact facade pattern to follow for the connection manager.

**Location**: `src/auth/providers/auth-service.provider.ts`

**Pattern Structure**:
```
1. Interface definition (IAuthService in auth-service.interface.ts)
2. Injection token constant (AUTH_SERVICE)
3. Provider factory with useFactory
4. Environment-based service selection using IS_OFFLINE
5. Both implementations injected, factory returns appropriate one
```

**Provider Implementation** (`src/auth/providers/auth-service.provider.ts:23-34`):
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

**Interface Pattern** (`src/auth/interfaces/auth-service.interface.ts`):
- Defines contract both implementations must satisfy
- JSDoc documentation for each method
- Input/output types imported from separate files

**Module Integration** (`src/auth/auth.module.ts:28-46`):
- Both services registered as providers
- Provider factory registered
- Token exported for injection in other modules

### 2. ValkeyPubSub - The Core Integration Point

**Location**: `src/subscription/pubsub/valkey-pubsub.ts`

**Current Architecture**:
- ValkeyPubSub manages subscription delivery
- Uses API Gateway Management API directly via `sendToConnection` private method
- Caches API Gateway client instance
- Gets endpoint from config via `getStandaloneConfig()`

**Key Method - publish()** (`src/subscription/pubsub/valkey-pubsub.ts:64-99`):
```typescript
async publish(
  operationName: string,
  payload: Record<string, unknown>,
  filters: SubscriptionFilters = {}
): Promise<void> {
  const subscribers = await this.valkeyService.getSubscribers(operationName, filters);
  const sendPromises = subscribers.map(async subscriber => {
    await this.sendToConnection(subscriber.connectionId, {
      id: subscriber.subscriptionId,
      type: "next",
      payload: { data: payload },
    });
  });
  await Promise.all(sendPromises);
}
```

**Key Method - sendToConnection()** (`src/subscription/pubsub/valkey-pubsub.ts:187-213`):
- This is the method that needs to be replaced with IConnectionManager
- Currently uses API Gateway client directly
- Handles GoneException by cleaning up stale connections

**Modification Strategy**:
The `sendToConnection` method should delegate to `IConnectionManager.sendToConnection()` instead of calling API Gateway directly. This allows the facade to work in both environments.

### 3. WebSocket Handlers (Lambda)

**Location**: `src/websocket/handlers/`

**Handler Structure**:
- `connect.handler.ts` - Stores connection in Valkey on $connect
- `disconnect.handler.ts` - Removes connection from Valkey on $disconnect
- `default.handler.ts` - Handles all GraphQL-WS protocol messages

**GraphQL-WS Message Handling** (`src/websocket/handlers/default.handler.ts:106-189`):
- `connection_init` -> responds with `connection_ack`
- `ping` -> responds with `pong`
- `subscribe` -> registers subscription in Valkey
- `complete` -> unregisters subscription from Valkey

**Message Types Defined** (`src/websocket/handlers/default.handler.ts:19-27`):
```typescript
type MessageType =
  | "connection_init"
  | "connection_ack"
  | "ping"
  | "pong"
  | "subscribe"
  | "next"
  | "error"
  | "complete";
```

### 4. Valkey Service and Interface

**Location**: `src/valkey/`

**ValkeyService** (`src/valkey/valkey.service.ts`):
- NestJS injectable service
- Implements OnModuleInit for connection setup
- Implements OnModuleDestroy for graceful cleanup
- Uses ConfigService for configuration

**Key Data Structures** (`src/valkey/valkey.interface.ts`):
- `ConnectionData` - userId, groups, connectedAt
- `SubscriptionData` - connectionId, subscriptionId, operationName, filters
- `SubscriptionFilters` - resourceId, ownerId, organizationId

**Key Functions**:
- `setConnection()` / `getConnection()` / `removeConnection()`
- `registerSubscription()` / `unregisterSubscription()`
- `getSubscribers()` - used by ValkeyPubSub.publish()

### 5. Configuration System

**Location**: `src/config/configuration.ts`

**Current WebSocket Config** (lines 110-114):
```typescript
interface WebsocketConfig {
  readonly apiEndpoint: string | undefined;
}
```

**Configuration Factory** (lines 166-168):
```typescript
websocket: {
  apiEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
}
```

**Extension Needed**:
Add `localPort` to WebsocketConfig interface and configuration factory:
```typescript
interface WebsocketConfig {
  readonly apiEndpoint: string | undefined;
  readonly localPort: number;  // Add this
}
```

### 6. NestJS Lifecycle Hooks

**OnModuleInit Examples**:

1. `src/valkey/valkey.service.ts:51-72` - Initializes Redis connection
2. `src/auth/guards/jwt-auth.guard.ts:47-66` - Validates Cognito config at startup

**Pattern for LocalConnectionManager**:
- Implement `OnModuleInit` to start WebSocket server on port 3001
- Use ConfigService to get port from `websocket.localPort`
- Log startup message

### 7. API Gateway Client Usage

**Location**: `src/websocket/shared/api-gateway-client.ts`

**Current Pattern**:
```typescript
export const sendToConnection = async (
  connectionId: string,
  domainName: string,
  stage: string,
  data: unknown
): Promise<boolean> => {
  const client = getApiGatewayClient(domainName, stage);
  // ... sends via PostToConnectionCommand
};
```

This shows the API Gateway client pattern that `APIGatewayConnectionManager` should use internally.

### 8. Mock JWT Utilities

**Location**: `src/auth/utils/mock-jwt.util.ts`

**Available Functions**:
- `generateMockAccessToken(userId)` - Creates local dev JWT
- `generateMockIdToken(userId, claims)` - Creates ID token with optional claims
- `decodeMockToken(token)` - Decodes without verification
- `isTokenExpired(token)` - Checks expiration

These utilities will be used by `LocalConnectionManager` for token validation.

### 9. Subscription Module Structure

**Location**: `src/subscription/subscription.module.ts`

**Current Structure**:
```typescript
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

**Note**: The connection manager should be integrated into this module or a new WebSocket module.

## Code References

| File | Line(s) | Description |
|------|---------|-------------|
| `src/auth/providers/auth-service.provider.ts` | 23-34 | Facade provider pattern reference |
| `src/auth/interfaces/auth-service.interface.ts` | 1-65 | Interface definition pattern |
| `src/subscription/pubsub/valkey-pubsub.ts` | 64-99 | publish() method to modify |
| `src/subscription/pubsub/valkey-pubsub.ts` | 187-213 | sendToConnection() to replace |
| `src/websocket/handlers/default.handler.ts` | 19-42 | GraphQL-WS message types |
| `src/config/configuration.ts` | 110-114, 166-168 | WebSocket config location |
| `src/valkey/valkey.service.ts` | 51-72 | OnModuleInit pattern |
| `src/auth/utils/mock-jwt.util.ts` | 140-177 | Mock token validation |
| `src/websocket/authorizer/ws-authorizer.handler.ts` | 90-127 | JWT validation for offline mode |

## Architecture Documentation

### Framework: NestJS with Serverless

**Key Architectural Patterns**:

1. **Module-based organization**: Each feature in its own module with clear exports
2. **Dependency Injection**: Services injected via constructor, providers for factories
3. **Global modules**: `@Global()` decorator for shared services (ValkeyModule, SubscriptionModule)
4. **Configuration**: Centralized in `src/config/configuration.ts` with typed namespaces
5. **Facades**: Environment-based service selection via provider factories

### Serverless Lambda Structure

- **Main Lambda**: `src/main.ts` - NestJS app wrapped with serverless-express
- **WebSocket Lambdas**: Separate handlers in `src/websocket/handlers/`
- **Authorizer Lambda**: `src/websocket/authorizer/ws-authorizer.handler.ts`

### Subscription Flow (Production)

```
Client -> API Gateway WebSocket -> Lambda Handler -> Valkey (store subscription)
                                                         |
Mutation -> ValkeyPubSub.publish() -> Valkey (get subscribers) -> API Gateway -> Client
```

### Subscription Flow (Local - Target State)

```
Client -> LocalConnectionManager WebSocket Server (port 3001)
                    |
                    v
              In-memory storage
                    |
Mutation -> ValkeyPubSub.publish() -> IConnectionManager.sendToConnection() -> Client
```

## Testing Patterns

### Unit Test Patterns

**Location**: `src/**/*.test.ts`

**Framework**: Jest (v30.0.0)

**Example to follow**: `src/auth/providers/auth-service.provider.test.ts`

**Conventions**:
1. Test file preamble with JSDoc
2. Mocked dependencies at top using `jest.mock()`
3. Test context interface for shared state
4. `createMock*` helper functions
5. `describe` blocks for logical grouping
6. `beforeEach` for mock reset with `jest.clearAllMocks()`

**Mock Pattern** (`src/subscription/pubsub/valkey-pubsub.test.ts:31-45`):
```typescript
const createMockValkeyService = (): jest.Mocked<ValkeyService> => {
  return {
    getSubscribers: jest.fn().mockResolvedValue([]),
    removeConnection: jest.fn().mockResolvedValue(undefined),
    // ... other methods
  } as unknown as jest.Mocked<ValkeyService>;
};
```

**Provider Test Pattern** (`src/auth/providers/auth-service.provider.test.ts:52-62`):
```typescript
it('should return LocalAuthService when IS_OFFLINE="true"', () => {
  (mockConfigService.get as jest.Mock).mockReturnValue("true");
  const result = authServiceProvider.useFactory(
    mockConfigService,
    mockAuthService,
    mockLocalAuthService
  );
  expect(mockConfigService.get).toHaveBeenCalledWith("IS_OFFLINE");
  expect(result).toBe(mockLocalAuthService);
});
```

### Integration Test Patterns

**Location**: `src/**/*.integration.test.ts`

**Example**: `src/subscription/subscription.integration.test.ts`

### Lambda Handler Test Patterns

**Location**: `src/websocket/handlers/*.test.ts`

**Example to follow**: `src/websocket/handlers/default.handler.test.ts`

**Conventions**:
- Mock event factory functions
- Mock Lambda Context object
- Test each message type separately
- Test error conditions (invalid JSON, missing fields)

## Documentation Patterns

### JSDoc Conventions

**Style**: TypeScript-flavor JSDoc with file preambles

**Required Tags**:
- `@file` - File name
- `@description` - Brief description
- `@module` - Module path
- `@remarks` - Additional implementation details (optional)

**File Preamble Example** (`src/subscription/pubsub/valkey-pubsub.ts:1-6`):
```typescript
/**
 * @file valkey-pubsub.ts
 * @description Custom PubSub implementation for serverless GraphQL subscriptions
 * @module subscription/pubsub
 */
```

**Function Documentation Example** (`src/subscription/pubsub/valkey-pubsub.ts:54-67`):
```typescript
/**
 * Publishes an event to all matching subscribers
 * @param operationName - The subscription operation name (e.g., "postCreated")
 * @param payload - The data to send to subscribers
 * @param filters - Optional filters for targeted delivery
 * @remarks
 * - Queries Valkey for matching subscriptions
 * - Sends GraphQL-WS "next" messages via API Gateway
 * - Removes stale connections on 410 Gone errors
 */
```

### Interface Documentation

**Example** (`src/valkey/valkey.interface.ts:24-31`):
```typescript
/**
 * WebSocket connection metadata stored in Valkey
 * @description Represents a connected WebSocket client
 */
export interface ConnectionData {
  /** Unique user identifier from JWT */
  userId: string;
  /** User's group memberships for authorization */
  groups: readonly string[];
  /** Timestamp when the connection was established */
  connectedAt: number;
}
```

## Dependencies

### Already Available

| Package | Version | Usage |
|---------|---------|-------|
| `graphql-ws` | ^6.0.6 | GraphQL-WS protocol implementation |
| `ws` | (peer dep) | WebSocket server (via graphql-ws) |
| `ioredis` | ^5.9.1 | Valkey/Redis client |
| `@aws-sdk/client-apigatewaymanagementapi` | ^3.967.0 | API Gateway client |

### May Need to Add

| Package | Purpose |
|---------|---------|
| `uuid` | Connection ID generation for local WebSocket |

**Note**: The brief mentions `uuid` may need to be added. Alternatively, `crypto.randomUUID()` from Node.js 22 can be used.

## Open Questions

### Q1: Connection ID Generation Strategy
**Question**: Should local connection IDs use `uuid` package or Node.js native `crypto.randomUUID()`?
**Context**: The brief suggests adding `uuid` dependency, but Node.js 22 (project target) has native `crypto.randomUUID()`.
**Impact**: Affects package.json and import statements in LocalConnectionManager.
**Answer**: _[Human fills this in before running /project:plan]_

### Q2: APIGatewayConnectionManager Implementation Location
**Question**: The brief only specifies creating `local-connection-manager.ts`. Should `APIGatewayConnectionManager` be a new file or extracted from existing code?
**Context**: The existing `api-gateway-client.ts` has similar functionality but is a utility file, not a NestJS service.
**Impact**: Affects whether we wrap existing code or create new service class.
**Answer**: _[Human fills this in before running /project:plan]_

### Q3: ValkeyPubSub Modification Scope
**Question**: Should ValkeyPubSub inject IConnectionManager, or should we modify the SubscriptionModule to create ValkeyPubSub with the connection manager?
**Context**: ValkeyPubSub currently uses `getStandaloneConfig()` for some config, suggesting it may be used outside NestJS DI context.
**Impact**: Affects how ValkeyPubSub gets the connection manager instance.
**Answer**: _[Human fills this in before running /project:plan]_
