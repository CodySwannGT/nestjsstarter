---
date: 2026-01-13T12:00:00-05:00
status: complete
last_updated: 2026-01-13
---

# Research

## Summary

This research investigates implementing GraphQL subscriptions for a NestJS backend deployed on AWS Lambda using Amazon API Gateway WebSocket APIs. The current codebase uses HTTP API Gateway with Apollo Server in a code-first GraphQL configuration. **Standard Apollo Server subscriptions cannot work with AWS Lambda** due to Lambda's stateless nature. The implementation requires a custom WebSocket API Gateway setup with DynamoDB for connection management and a custom PubSub adapter to bridge NestJS subscription decorators to the API Gateway Management API.

## Detailed Findings

### Current GraphQL Configuration

The backend uses NestJS with Apollo Server in a code-first approach.

**App Module Configuration** (`src/app.module.ts:23-52`):
- `GraphQLModule.forRootAsync` with `ApolloDriver`
- Schema auto-generated via `autoSchemaFile`
- Playground disabled, introspection enabled
- Auth enforcement via `combinedAuthTransformer` schema transformation
- DataLoader integration via context factory

**Apollo Server Settings**:
- Query complexity limiting via `ComplexityPlugin` (max: 100)
- No subscriptions currently configured

### Current Serverless Configuration

**File**: `serverless.yml`

The backend is deployed using Serverless Framework v4 with:
- **HTTP API Gateway (v2)** - NOT REST API or WebSocket
- **Single Lambda function** (`main`) with proxy integration (`/{proxy+}`)
- **Runtime**: Node.js 22.x
- **Bundler**: serverless-esbuild with custom plugins

**Current API Gateway Events**:
```yaml
events:
  - httpApi:
      method: ANY
      path: /{proxy+}
  - httpApi:
      method: GET
      path: /health
```

**No WebSocket API configuration exists** - this must be added for subscriptions.

### Resolver and Mutation Patterns

**File Structure Pattern**:
- `src/<feature>/<feature>.resolver.ts` - Resolver class
- `src/<feature>/<feature>.service.ts` - Business logic
- `src/<feature>/<feature>.module.ts` - NestJS module

**Example Resolver** (`src/hello/hello.resolver.ts`):
```typescript
@Resolver()
export class HelloResolver {
  @Query(() => String, { description: "Public health check" })
  @Public()
  hello(): string { ... }

  @Mutation(() => String, { description: "Requires authentication" })
  @Authed()
  greet(@Args("name") name: string): string { ... }
}
```

**Authorization Decorators** (required on all operations):
- `@Public()` - No authentication required
- `@Authed()` - Any authenticated user
- `@Groups(...groups)` - Specific group membership
- `@Owner(ownerField?)` - Field-level ownership check

### AWS API Gateway WebSocket Architecture

For serverless GraphQL subscriptions, the required architecture is:

**WebSocket Routes**:
| Route | Purpose |
|-------|---------|
| `$connect` | Store connectionId, authorize client |
| `$disconnect` | Remove connectionId from storage |
| `$default` | Handle GraphQL-WS protocol messages |

**Connection Management**:
- Store `connectionId` in DynamoDB on `$connect`
- Track subscription registrations per connection
- Remove on `$disconnect`
- Query connections when broadcasting

**Message Broadcasting**:
```typescript
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const client = new ApiGatewayManagementApiClient({
  endpoint: "https://{api-id}.execute-api.{region}.amazonaws.com/{stage}"
});

await client.send(new PostToConnectionCommand({
  ConnectionId: "connection-id",
  Data: JSON.stringify({ type: "next", payload: { ... } })
}));
```

### NestJS Subscription Implementation

**Standard NestJS Subscription Pattern** (does NOT work with Lambda):
```typescript
@Subscription(() => Post)
postAdded() {
  return pubSub.asyncIterator('postAdded');
}
```

**Why Standard Subscriptions Don't Work**:
1. Lambda functions are stateless and short-lived
2. WebSocket connections require persistent server connections
3. In-memory PubSub cannot span Lambda invocations

**Required Custom Implementation**:
1. Custom PubSub adapter that stores subscriptions in DynamoDB
2. WebSocket Lambda handlers for `$connect`, `$disconnect`, `$default`
3. Event broadcasting via API Gateway Management API
4. GraphQL-WS protocol implementation

### Subscription Event Flow

For the brief requirement of auto-subscriptions on mutations (onCreate, onUpdate, onDelete):

```
1. Client connects via WebSocket → $connect Lambda stores connectionId
2. Client sends GQL_CONNECTION_INIT → Handler acknowledges
3. Client sends GQL_START with subscription query → Store in DynamoDB
4. HTTP mutation executes → Mutation resolver triggers event
5. Event triggers subscription broadcast → Query DynamoDB for subscribers
6. Send GQL_DATA to each connection via PostToConnection
```

### Serverless Framework WebSocket Configuration

**Example Configuration** (to be added):
```yaml
provider:
  websocketsApiName: thumbwar-websockets
  websocketsApiRouteSelectionExpression: $request.body.type

functions:
  wsConnect:
    handler: src/websocket/handlers.connect
    events:
      - websocket:
          route: $connect

  wsDisconnect:
    handler: src/websocket/handlers.disconnect
    events:
      - websocket:
          route: $disconnect

  wsDefault:
    handler: src/websocket/handlers.default
    events:
      - websocket:
          route: $default
```

## Code References

### Current Configuration Files
- `src/app.module.ts:23-52` - GraphQL module configuration
- `src/main.ts:20-62` - Lambda bootstrap
- `src/index.ts:8` - Handler export
- `serverless.yml:1-67` - Serverless deployment configuration

### GraphQL Infrastructure
- `src/graphql/complexity.plugin.ts:57-98` - Query complexity plugin
- `src/auth/auth.transformer.ts:166-308` - Schema auth transformation

### Auth Decorators
- `src/auth/decorators/auth-public.decorator.ts:23-27` - `@Public()`
- `src/auth/decorators/auth-authed.decorator.ts:21-25` - `@Authed()`
- `src/auth/decorators/auth-groups.decorator.ts:22-28` - `@Groups()`
- `src/auth/decorators/auth-owner.decorator.ts:20-26` - `@Owner()`
- `src/auth/decorators/field-auth.decorator.ts:27-29` - `@FieldAuth()`

### Example Resolver
- `src/hello/hello.resolver.ts:27-70` - Hello resolver with query and mutation

### DataLoader Pattern
- `src/data-loader/data-loader.interface.ts:9-24` - DataLoader interface
- `src/data-loader/data-loader.service.ts` - DataLoader factory service

## Architecture Documentation

### Framework Stack
- **Runtime**: NestJS 11.x on Node.js 22.x
- **GraphQL**: Apollo Server 5.x via `@nestjs/apollo`
- **Schema**: Code-first approach with `@nestjs/graphql`
- **Deployment**: AWS Lambda via Serverless Framework 4.x
- **API Gateway**: HTTP API (v2) - WebSocket API to be added

### Current Patterns

**Zero-Trust Authorization**:
Every Query/Mutation must have an explicit auth decorator or schema build fails at startup. Auth is enforced via GraphQL schema transformation using `@graphql-tools/utils`.

**DataLoader Integration**:
DataLoaders are created per-request via `DataLoaderService.getLoaders()` and injected into GraphQL context for N+1 prevention.

**Module Structure**:
```
src/
  <feature>/
    <feature>.module.ts      # NestJS module
    <feature>.resolver.ts    # GraphQL resolver
    <feature>.service.ts     # Business logic
    <feature>.resolver.test.ts
    <feature>.service.test.ts
```

## Testing Patterns

### Unit Test Patterns
- **Location**: `src/**/*.test.ts` (co-located with source files)
- **Framework**: Jest with ts-jest
- **Example to follow**: `src/hello/hello.resolver.test.ts`, `src/hello/hello.service.test.ts`
- **Conventions**:
  - TestContext pattern for sharing state across tests
  - Factory functions for creating test instances
  - Inline mocks using `jest.mock()`
  - JSDoc file headers on all test files

### Integration Test Patterns
- **Location**: `src/**/*.integration.test.ts`
- **Example to follow**: None exist currently
- **Conventions**: Excluded from unit test runs via `--testPathIgnorePatterns`

### E2E Test Patterns
- **Location**: Not configured
- **Framework**: Not configured
- **Conventions**: N/A

### Test Configuration
- **Config file**: `jest.config.ts`
- **Test regex**: `.*\\.test\\.ts$`
- **Module mapper**: `^@/(.*)$` -> `<rootDir>/$1`

## Documentation Patterns

### JSDoc Conventions
- **Style**: TypeScript-flavor JSDoc (no types in JSDoc, TypeScript provides them)
- **Example**: `src/main.ts:15-19`, `src/data-loader/data-loader.interface.ts:9-24`
- **Required tags**:
  - `@file` - File name
  - `@description` - Purpose description
  - `@module` - Module name
  - `@param name - Description` - Parameter with dash syntax
  - `@returns` - Return value description
  - `@remarks` - Additional notes (custom tag)
  - `@example` - Usage examples with fenced code blocks

### GraphQL Descriptions
- **Convention**: Use `description` option in decorators
- **Example**: `@Query(() => String, { description: "Public health check" })`
- **Required for**: All public-facing queries, mutations, and subscriptions

## Open Questions

### Q1: Subscription Event Source
**Question**: What triggers subscription events - direct mutation calls, EventBridge events, or SNS/SQS?
**Context**: The brief states mutations should auto-include subscriptions (onCreate, onUpdate, onDelete). The mechanism for triggering these events affects the architecture significantly.
**Impact**: Determines whether to use synchronous broadcasting within mutation resolvers or asynchronous event-driven architecture.
**Answer**: **Direct mutation calls via Valkey pub/sub**. Mutations publish to a Valkey channel (fire-and-forget, non-blocking), and WebSocket Lambda handlers subscribe to these channels to push updates to connected clients. This provides low latency (~50ms), minimal infrastructure, and leverages Valkey's native pub/sub capabilities that we're already adding for connection storage.

### Q2: Authentication at WebSocket Connect
**Question**: Should WebSocket connections use the same Cognito/JWT authentication as HTTP requests, or a different mechanism?
**Context**: WebSocket `$connect` can use AWS IAM, NONE, or custom Lambda authorizer. The current HTTP API uses context-based auth transformation.
**Impact**: Affects `$connect` handler implementation and whether existing auth decorators can be reused.
**Answer**: **Custom Lambda authorizer** that validates the same Cognito/JWT tokens used by HTTP requests. The token will be passed via query string (`wss://...?token=JWT`) and validated at `$connect`. User context (userId, groups, etc.) will be stored in Valkey alongside the connectionId, enabling the same auth decorator patterns (`@Authed()`, `@Groups()`, `@Owner()`) for subscription authorization.

### Q3: Connection Storage Strategy
**Question**: Should a new DynamoDB table be created for WebSocket connections, or should it use an existing data store?
**Context**: Connection management requires storing connectionId, subscription registrations, and metadata. No DynamoDB configuration currently exists in the codebase.
**Impact**: Affects Serverless resource configuration and whether to add DynamoDB as a new dependency.
**Answer**: Use **Amazon ElastiCache Serverless for Valkey** in AWS environments. For local development, use the official **Valkey Docker image** (`valkey/valkey:8-alpine`). This provides Redis-compatible semantics with serverless scaling in production and identical API locally. Lambda functions will require VPC configuration to access ElastiCache. A `docker-compose.yml` will be added for local Valkey.

### Q4: Subscription Filtering Scope
**Question**: What filtering criteria should subscriptions support (e.g., by resource ID, by owner, by organization)?
**Context**: The brief mentions onCreate/onUpdate/onDelete patterns but doesn't specify filtering. Filtering affects subscription registration storage and broadcasting logic.
**Impact**: Determines DynamoDB schema design and query patterns for efficient subscription matching.
**Answer**: Support filtering by **resource ID**, **owner**, or **organization**. Subscriptions can specify any combination of these filters when registering. The Valkey storage schema will index subscriptions by these criteria for efficient lookup during broadcast.

### Q5: Package Dependencies
**Question**: Should the implementation use existing GraphQL-WS libraries (graphql-ws, graphql-subscriptions) or build a custom protocol handler?
**Context**: Standard libraries assume persistent server connections. A custom implementation provides more control but requires more code.
**Impact**: Affects complexity, maintenance burden, and compatibility with client libraries.
**Answer**: **Use existing libraries** (`graphql-ws`, `graphql-subscriptions`). This ensures compatibility with standard GraphQL clients (Apollo Client, urql, etc.), reduces maintenance burden, and follows established protocol standards. Custom adapters will bridge these libraries to the serverless WebSocket + Valkey infrastructure.

## External Documentation References

### AWS Documentation
- [API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [WebSocket API Routes](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html)
- [API Gateway Management API SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/apigatewaymanagementapi/)
- [WebSocket API Chat App Tutorial](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-chat-app.html)

### NestJS/GraphQL Documentation
- [NestJS GraphQL Subscriptions](https://docs.nestjs.com/graphql/subscriptions)
- [Apollo Server Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions)

### Serverless Framework Documentation
- [WebSocket Events](https://www.serverless.com/framework/docs/providers/aws/events/websocket)
