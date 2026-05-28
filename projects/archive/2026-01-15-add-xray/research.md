---
date: 2026-01-15T12:00:00-05:00
status: complete
last_updated: 2026-01-15
---

# Research

## Summary

This research documents the current state of the thumbwar backend codebase relevant to implementing AWS X-Ray distributed tracing. The project has a partial X-Ray implementation (TypeORM logger) but lacks SDK initialization, Lambda handler integration, GraphQL tracing, and serverless infrastructure configuration.

Key findings:
- **TypeORM X-Ray Logger exists** but uses dynamic require with graceful degradation
- **aws-xray-sdk-core is NOT installed** - needs to be added as a dependency
- **No X-Ray initialization** in main.ts or WebSocket handlers
- **No serverless.yml tracing configuration** or IAM permissions
- **Reference implementation exists** at sample-project/backend-v2
- **Skills documentation** provides observability patterns

## Detailed Findings

### Existing X-Ray Implementation

The codebase has one X-Ray-related file:

**`src/database/typeorm-xray-logger.ts`**
- Implements TypeORM Logger interface
- Uses dynamic `require("aws-xray-sdk-core")` for graceful degradation
- Creates subsegments for database queries with annotations
- Extracts query type and table name from SQL
- Sanitizes parameters to prevent logging sensitive data
- Falls back to NestJS Logger when X-Ray is unavailable

The logger is already integrated in `src/database/database.config.ts:91`:
```typescript
logger: new TypeOrmXRayLogger(),
```

### Lambda Handlers Structure

**Main Lambda Handler (`src/main.ts`)**
- Uses `@vendia/serverless-express` for NestJS/Lambda integration
- Implements warm start caching pattern
- Currently has NO X-Ray initialization

**WebSocket Handlers (`src/websocket/handlers/`)**
- `connect.handler.ts`: Stores connectionId in Valkey
- `disconnect.handler.ts`: Removes connection from Valkey
- `default.handler.ts`: Handles GraphQL-WS protocol messages
- All use `APIGatewayProxyHandler` type from aws-lambda
- Currently have NO X-Ray initialization

**WebSocket Authorizer (`src/websocket/authorizer/ws-authorizer.handler.ts`)**
- Validates JWT tokens using `aws-jwt-verify`
- Uses `getStandaloneConfig()` for configuration (outside NestJS context)
- Currently has NO X-Ray initialization

### Serverless Configuration

**`serverless.yml`**
- Defines 5 Lambda functions: main, wsConnect, wsDisconnect, wsDefault, wsAuthorizer
- Uses `serverless-esbuild` for bundling
- Currently has NO X-Ray tracing configuration
- IAM role only has `execute-api:ManageConnections` permission

Missing configuration needed:
```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - 'xray:PutTraceSegments'
            - 'xray:PutTelemetryRecords'
          Resource: '*'
```

### Dependencies

**Current `package.json`**
- `aws-xray-sdk-core` is NOT listed as a dependency
- Has `@aws-sdk/client-cognito-identity-provider` (will be auto-traced by HTTP patching)
- Has `@aws-sdk/client-apigatewaymanagementapi` (will be auto-traced)

### GraphQL Plugin Pattern

**Existing Plugin (`src/graphql/complexity.plugin.ts`)**
- Uses `@Plugin()` decorator from `@nestjs/apollo`
- Implements `ApolloServerPlugin` interface
- Injects `GraphQLSchemaHost` and `ConfigService`
- Registered in `AppModule.providers` array
- Provides pattern for implementing `OperationLoggingPlugin`

**Apollo Server Configuration (`src/app.module.ts`)**
- Uses `GraphQLModule.forRootAsync()` with `ApolloDriver`
- Has `DataLoaderService` integration for context
- Current providers: `[ComplexityPlugin]`

### Valkey Service

**`src/valkey/valkey.service.ts`**
- NestJS Injectable service with lifecycle hooks
- Uses `ioredis` Redis client
- Methods that should be traced:
  - `setConnection()` - Stores WebSocket connection
  - `getConnection()` - Retrieves connection data
  - `removeConnection()` - Removes connection and subscriptions
  - `registerSubscription()` - Registers GraphQL subscription
  - `unregisterSubscription()` - Removes subscription
  - `getSubscribers()` - Gets all subscribers for trigger
  - `publish()` - Publishes to channel

**`src/websocket/shared/valkey-client.ts`**
- Standalone Valkey client for WebSocket handlers (outside NestJS)
- Uses `getStandaloneConfig()` for configuration
- Similar methods to ValkeyService
- Needs separate tracing integration

### Auth Services

**`src/auth/services/cognito.service.ts`**
- Uses `CognitoIdentityProviderClient` from AWS SDK v3
- Methods making external calls:
  - `initiateAuthCustom()` - InitiateAuthCommand
  - `respondToAuthChallenge()` - RespondToAuthChallengeCommand
  - `refreshToken()` - AdminInitiateAuthCommand
  - `globalSignOut()` - GlobalSignOutCommand
- HTTP calls will be auto-traced by patching `http`/`https` modules

### Configuration Pattern

**`src/config/configuration.ts`**
- Central configuration factory
- Provides `getStandaloneConfig()` for Lambda handlers outside NestJS
- Has `app.isOffline` flag for local development detection
- Pattern for adding new config:
  ```typescript
  interface XRayConfig {
    readonly enabled: boolean;
  }
  export interface Configuration {
    // ...existing
    readonly xray: XRayConfig;
  }
  ```

## Code References

### Files to Modify

- `serverless.yml:36-51` - Add tracing and IAM permissions
- `package.json` - Add `aws-xray-sdk-core` dependency
- `src/main.ts:1-10` - Add X-Ray initialization at top of file
- `src/websocket/handlers/connect.handler.ts:1-10` - Add X-Ray initialization
- `src/websocket/handlers/disconnect.handler.ts:1-10` - Add X-Ray initialization
- `src/websocket/handlers/default.handler.ts:1-10` - Add X-Ray initialization
- `src/websocket/authorizer/ws-authorizer.handler.ts:1-10` - Add X-Ray initialization
- `src/app.module.ts:67` - Register OperationLoggingPlugin
- `src/database/typeorm-xray-logger.ts:122-133` - Update to use shared X-Ray config

### New Files to Create

- `src/tracing/xray.config.ts` - X-Ray SDK initialization
- `src/tracing/with-subsegment.ts` - Utility function for custom tracing
- `src/tracing/index.ts` - Barrel export
- `src/graphql/operation-logging.plugin.ts` - GraphQL operation tracing plugin

## Architecture Documentation

### Framework: NestJS with Serverless

- **NestJS v11** - Core application framework
- **Apollo Server v5** - GraphQL server via `@nestjs/graphql`
- **Serverless Framework v4** - Lambda deployment
- **serverless-esbuild** - Bundling with custom plugins
- **TypeORM** - Database ORM with PostgreSQL

### Dependency Injection Pattern

Services use constructor injection:
```typescript
constructor(
  private readonly configService: ConfigService<Configuration, true>
) {}
```

### Lambda Handler Pattern

Lambda handlers outside NestJS use `getStandaloneConfig()`:
```typescript
import { getStandaloneConfig } from "../../config/configuration";
const config = getStandaloneConfig();
```

### Plugin Pattern

Apollo plugins use `@Plugin()` decorator:
```typescript
@Plugin()
export class MyPlugin implements ApolloServerPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener> {
    // ...
  }
}
```

## Testing Patterns

### Unit Test Patterns

- **Location**: `src/**/*.test.ts`
- **Framework**: Jest with ts-jest
- **Example to follow**: `src/database/typeorm-xray-logger.test.ts`
- **Conventions**:
  - Test file co-located with source file
  - Uses `describe`/`it` blocks
  - Mock NestJS Logger with `jest.mock()`
  - Test graceful degradation without X-Ray SDK
  - Extract test constants to avoid duplicate string lint errors

### Integration Test Patterns

- **Location**: `src/**/*.integration.test.ts`
- **Example to follow**: `src/auth/auth.integration.test.ts`
- **Conventions**: Test actual service interactions

### Jest Configuration

- **File**: `jest.config.ts`
- **Test regex**: `.*\\.test\\.ts$`
- **Transform**: ts-jest
- **Environment**: node

### X-Ray Test Strategy

Based on existing `typeorm-xray-logger.test.ts`:
1. Mock NestJS Logger to verify logging calls
2. Test that methods don't throw without X-Ray SDK
3. Test graceful degradation scenarios
4. DO NOT mock X-Ray SDK - test fallback behavior

## Documentation Patterns

### JSDoc Conventions

- **Style**: File preamble with `@file`, `@description`, `@module`, `@remarks`
- **Example**: `src/database/typeorm-xray-logger.ts:1-15`
- **Required tags**:
  - `@file` - File name
  - `@description` - Brief description
  - `@module` - Module path
  - `@remarks` - Additional context
  - `@param` - Function parameters
  - `@returns` - Return value

### Database Comments (Backend Only)

- **Convention**: Not applicable - using TypeORM entity decorators
- **Example**: See `src/database/entities/` for entity patterns

### GraphQL Descriptions (Backend Only)

- **Convention**: GraphQL descriptions via decorators
- **Example**: `@Field({ description: 'User ID' })`
- **Required for**: Public API fields, complex types

## Reference Implementation

### sample-project/backend-v2

- **File**: `src/database/typeorm-xray-logger.ts`
- Uses `aws-xray-sdk` (full package, not core)
- More comprehensive implementation with:
  - Query hash generation for grouping similar queries
  - Subsegment execution pattern with error handling
  - Detailed X-Ray annotations and metadata

Key differences from thumbwar implementation:
- thumbwar uses `aws-xray-sdk-core` (lighter)
- thumbwar uses interface types instead of `any`
- thumbwar exports utility functions separately

### Skills Documentation

**`.claude/skills/typeorm-patterns/references/observability-patterns.md`**
- Documents X-Ray logger implementation pattern
- Shows serverless.yml configuration
- Provides test patterns
- Documents annotation vs metadata usage

## Open Questions

[None identified]

The brief.md is comprehensive and provides all necessary details for implementation including:
- Exact file contents to create
- Configuration changes needed
- Testing strategy
- Security considerations
- Performance considerations
