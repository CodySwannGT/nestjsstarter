---
date: 2026-01-16T12:00:00-05:00
status: complete
last_updated: 2026-01-16
---

# Research

## Summary

This research documents the existing codebase patterns relevant to implementing Sentry error monitoring and performance tracing in the NestJS backend. The codebase has a well-established AWS X-Ray tracing module (`src/tracing/`) that provides an excellent reference pattern for Sentry integration, including graceful degradation, initialization tracking, and Lambda handler wrapper utilities. The architecture uses NestJS modules with ConfigService for type-safe configuration, and WebSocket Lambda handlers operate outside the NestJS context requiring standalone configuration access.

## Detailed Findings

### Module Structure Patterns

The codebase uses two module patterns:

1. **Global Modules** - Use `@Global()` decorator for application-wide services:
   - `src/valkey/valkey.module.ts:17-22` - ValkeyModule is marked global and exports ValkeyService
   - `src/config/config.module.ts:27-36` - ConfigModule wraps NestConfigModule with `isGlobal: true`

2. **Feature Modules** - Standard modules imported where needed:
   - `src/auth/auth.module.ts:28-47` - AuthModule with providers, guards, and resolver

The SentryModule should follow the ValkeyModule pattern as a global module since error capture is needed application-wide.

### Service Implementation Patterns

Services follow consistent patterns for configuration and lifecycle management:

**ConfigService Injection Pattern** (`src/valkey/valkey.service.ts:43-45`):
```typescript
constructor(
  private readonly configService: ConfigService<Configuration, true>
) {}
```

**Configuration Access Pattern** (`src/valkey/valkey.service.ts:299-306`):
```typescript
private getConfig(): ValkeyConfig {
  return {
    host: this.configService.get("valkey.host", { infer: true }),
    port: this.configService.get("valkey.port", { infer: true }),
  };
}
```

**Lifecycle Hooks** (`src/valkey/valkey.service.ts:39,51,78`):
- `OnModuleInit` for initialization
- `OnModuleDestroy` for cleanup

### Existing Tracing Pattern (X-Ray Reference)

The X-Ray tracing module at `src/tracing/` is the most relevant reference for Sentry implementation:

**Initialization Tracking** (`src/tracing/xray.config.ts:26-27`):
```typescript
const initState = { initialized: false };
```

**Graceful Degradation** (`src/tracing/xray.config.ts:42-85`):
- Checks `IS_OFFLINE` environment variable
- Uses try-catch for SDK availability
- Logs warnings on failure without throwing
- Returns early if already initialized (idempotent)

**Dynamic Require for Optional Dependencies** (`src/tracing/xray.config.ts:59-60`):
```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic require for optional dependency
const AWSXRay = require("aws-xray-sdk-core");
```

**Barrel Exports** (`src/tracing/index.ts`):
- Clean exports from a single index file
- Exports both functions and types

### Lambda Handler Patterns

WebSocket handlers demonstrate the pattern for Lambda functions outside NestJS context:

**Early Initialization** (`src/websocket/handlers/connect.handler.ts:7-8`):
```typescript
import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();
```

**Wrapper Utility Usage** (`src/websocket/handlers/connect.handler.ts:27-66`):
```typescript
return withXRaySubsegment(
  "WebSocket:Connect",
  async () => {
    // Handler logic
  },
  { annotations: { connectionId: connectionId ?? "unknown" } }
);
```

**Error Handling** (`src/websocket/handlers/connect.handler.ts:56-58`):
```typescript
} catch (error) {
  console.error("Failed to store connection:", error);
  return { statusCode: 500, body: "Connection failed" };
}
```

### Configuration System

**Central Configuration Factory** (`src/config/configuration.ts:133-169`):
- Single source of truth for all environment variables
- Organized into namespaces (app, database, valkey, cognito, graphql, websocket)
- Returns typed `Configuration` interface

**Standalone Config Access** (`src/config/configuration.ts:193`):
```typescript
export const getStandaloneConfig = configuration;
```
Used by Lambda handlers that cannot access ConfigService.

**ESLint Rule** - Direct `process.env` access is forbidden except in `configuration.ts`:
```javascript
// eslint.config.mjs - no-restricted-syntax rule
"MemberExpression[object.name='process'][property.name='env']"
```

### Main Entry Point

**Lambda Handler** (`src/main.ts`):
- X-Ray initialization happens FIRST before any imports
- Uses closure pattern for warm start caching
- `NestFactory.create(AppModule)` bootstraps the application

**Current Module Import Order** (`src/app.module.ts:35-67`):
1. ConfigModule
2. GraphQLModule
3. AuthModule, DataLoaderModule, DatabaseModule, HealthModule, HelloModule, SubscriptionModule, ValkeyModule

SentryModule should be imported BEFORE ConfigModule for earliest possible error capture.

### Serverless Configuration

**Environment Variables** (`serverless.yml`):
- Currently no Sentry variables configured
- Pattern for SSM parameters: `${ssm:/thumbwar/${sls:stage}/key, 'default'}`
- Source maps already enabled: `sourcemap: true`

**Function Definitions** (`serverless.yml:96-140`):
- `main` - HTTP API handler
- `wsConnect`, `wsDisconnect`, `wsDefault` - WebSocket handlers
- `wsAuthorizer` - WebSocket authorizer

### Exception Handling

**Current State**: No global exception filter exists in the codebase. Errors are handled:
- In resolvers via try-catch and error types
- In Lambda handlers via try-catch with console.error
- NestJS provides default exception handling

The brief proposes adding `SentryExceptionFilter` as a global filter via `APP_FILTER` provider.

## Code References

### Module Patterns
- `src/valkey/valkey.module.ts:17-22` - Global module pattern with exports
- `src/config/config.module.ts:27-36` - ConfigModule with forRoot pattern
- `src/auth/auth.module.ts:28-47` - Feature module with providers

### Service Patterns
- `src/valkey/valkey.service.ts:39-45` - Service with ConfigService injection
- `src/valkey/valkey.service.ts:51-72` - OnModuleInit implementation
- `src/valkey/valkey.service.ts:78-84` - OnModuleDestroy implementation

### Tracing Patterns (Reference for Sentry)
- `src/tracing/index.ts:1-18` - Barrel exports
- `src/tracing/xray.config.ts:26-85` - Initialization with graceful degradation
- `src/tracing/with-subsegment.ts:263-289` - Wrapper utility pattern

### Lambda Handler Patterns
- `src/websocket/handlers/connect.handler.ts:7-8` - Early initialization
- `src/websocket/handlers/connect.handler.ts:22-67` - Handler with wrapper
- `src/websocket/handlers/default.handler.ts:109-204` - Complex handler logic

### Configuration
- `src/config/configuration.ts:119-126` - Configuration interface
- `src/config/configuration.ts:133-169` - Configuration factory
- `src/config/configuration.ts:193` - getStandaloneConfig export

### Entry Points
- `src/main.ts:1-3` - X-Ray initialization before imports
- `src/main.ts:24-47` - Lambda handler with warm start caching
- `src/app.module.ts:34-69` - Root module with import order

## Architecture Documentation

### NestJS Framework Usage
- **Modules**: Global and feature modules with providers/exports
- **Services**: Injectable classes with ConfigService dependency injection
- **Lifecycle Hooks**: OnModuleInit and OnModuleDestroy for initialization/cleanup
- **Exception Filters**: APP_FILTER token for global exception handling
- **Testing**: @nestjs/testing with Test.createTestingModule()

### Lambda Architecture
- **Serverless Framework 4.x**: Deployment and configuration
- **serverless-esbuild**: TypeScript bundling with source maps
- **Warm Start Caching**: Closure pattern for cached server instance
- **WebSocket Handlers**: Standalone Lambda functions outside NestJS context

### Tracing Architecture
- **AWS X-Ray**: Distributed tracing with graceful degradation
- **Early Initialization**: X-Ray initialized before module imports
- **Wrapper Utilities**: Functions for adding subsegments to traces
- **Offline Support**: Disabled in local development (IS_OFFLINE=true)

## Testing Patterns

### Unit Test Patterns
- **Location**: `src/**/*.test.ts` (co-located with source files)
- **Framework**: Jest with ts-jest transformer
- **Example to follow**: `src/valkey/valkey.service.test.ts`
- **Conventions**:
  - Test context interface for type-safe state
  - `createMock*` helper functions
  - `beforeEach`/`afterEach` for setup/teardown
  - Module cleanup with `module.close()`
  - Descriptive test names with nested describe blocks

### Integration Test Patterns
- **Location**: `src/**/*.integration.test.ts`
- **Example to follow**: `src/auth/auth.integration.test.ts`
- **Conventions**:
  - Full module compilation with dependencies
  - Environment setup in beforeAll
  - Cleanup in afterAll
  - Tests actual service interactions

### Lambda Handler Test Patterns
- **Example to follow**: `src/websocket/handlers/connect.handler.test.ts`
- **Conventions**:
  - Mock external dependencies with `jest.mock()`
  - `createMockEvent()` helper for API Gateway events
  - `mockContext` constant for Lambda context
  - Test both success and error paths

### Graceful Degradation Tests
- **Example to follow**: `src/tracing/xray.config.test.ts`
- **Conventions**:
  - Test behavior when SDK unavailable
  - Test idempotent initialization
  - Use `jest.resetModules()` for isolation
  - Mock SDK to simulate failures

## Documentation Patterns

### JSDoc Conventions
- **Style**: TypeScript-flavored JSDoc with @file preambles
- **Example**: `src/valkey/valkey.service.ts:1-6`
- **Required tags**:
  - @file - Filename
  - @description - Brief description
  - @module - Module name
  - @param - Parameter descriptions
  - @returns - Return value description
  - @remarks - Implementation notes
  - @throws - Error conditions (when applicable)

### File Preamble Pattern
```typescript
/**
 * @file filename.ts
 * @description Brief description of the file
 * @module module-name
 *
 * @remarks
 * Additional implementation notes
 */
```

### Function Documentation Pattern
```typescript
/**
 * Brief description
 * @description Longer description if needed
 * @param paramName - Parameter description
 * @returns Return value description
 * @remarks Implementation notes
 */
```

### Interface Documentation Pattern
```typescript
/**
 * Interface description
 */
interface InterfaceName {
  /** Property description */
  readonly propertyName: Type;
}
```

## Open Questions

### Q1: Sentry Configuration Namespace Integration
**Question**: Should Sentry configuration be added to the existing Configuration interface in `src/config/configuration.ts`, or should the SentryService access environment variables directly?
**Context**: The brief shows the SentryService accessing environment variables via ConfigService without a defined namespace. The project enforces a strict pattern where configuration.ts is the single source of truth for env vars, but the proposed code bypasses this by reading SENTRY_* variables directly from ConfigService.
**Impact**: Affects how Sentry configuration is loaded and whether it integrates with the typed Configuration system.
**Answer**: _Add a `sentry` namespace to the Configuration interface for consistency with existing patterns (database, valkey, cognito). The SentryService should use `configService.get("sentry.dsn", { infer: true })` rather than `configService.get<string>("SENTRY_DSN")`._

### Q2: Lambda Wrapper vs X-Ray Integration
**Question**: Should the Sentry Lambda wrapper utility co-exist with X-Ray tracing, or should they be combined?
**Context**: The WebSocket handlers currently use `withXRaySubsegment()` for tracing. The brief proposes a separate `wrapLambdaHandler()` for Sentry. Having both could create nested wrappers.
**Impact**: Affects handler structure and performance overhead.
**Answer**: _Keep them separate. X-Ray provides distributed tracing, Sentry provides error capture. They serve different purposes and the overhead is minimal. Handlers would use X-Ray wrapper for operations and Sentry wrapper for the handler itself._

### Q3: process.env Access in Lambda Wrapper
**Question**: The brief's Lambda wrapper uses `process.env.SENTRY_DSN` directly. Is this acceptable given the eslint rule against direct process.env access?
**Context**: The Lambda wrapper runs outside NestJS context and cannot access ConfigService. The X-Ray module uses process.env for IS_OFFLINE check with an eslint-disable comment.
**Impact**: Affects code consistency and linting compliance.
**Answer**: _Acceptable with eslint-disable comment as shown in `src/tracing/xray.config.ts:48-49`. The Lambda wrapper utility is a standalone function outside NestJS context, similar to how X-Ray handles it._

## External Resources

- [Official Sentry NestJS Documentation](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [NestJS Sentry Recipe](https://docs.nestjs.com/recipes/sentry)
- [@sentry/nestjs npm Package](https://www.npmjs.com/package/@sentry/nestjs)
- [Sentry NestJS Example Project](https://github.com/ericjeker/nestjs-sentry-example)
