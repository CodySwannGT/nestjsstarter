# Sentry Backend Integration Spec

## Overview

Add Sentry error monitoring and performance tracing to the NestJS backend, with graceful degradation when Sentry is not configured.

## Requirements

### Functional Requirements

1. **Graceful Degradation**: The application MUST NOT fail to start or function if Sentry DSN is not configured. All Sentry operations must be no-ops when unconfigured.

2. **Error Capture**: Automatically capture and report all unhandled exceptions from:
   - GraphQL resolvers (via global exception filter)
   - HTTP endpoints (via global exception filter)
   - WebSocket Lambda handlers (via wrapper utility)

3. **Performance Tracing**: Enable distributed tracing for request flows with configurable sample rates.

4. **User Context**: Capture authenticated user information when available for error correlation.

5. **Environment Separation**: Use distinct environment names matching deployment stages (development, staging, production).

### Non-Functional Requirements

1. Minimal performance impact on Lambda cold starts
2. Source map support for readable stack traces
3. Follow existing codebase patterns (modules, services, configuration)

## Technical Design

### Package Installation

```bash
bun add @sentry/nestjs @sentry/profiling-node
```

### Environment Variables

Add to `.env.example`:

```bash
# Sentry Configuration (optional - gracefully degrades when not set)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### File Structure

```text
src/
├── sentry/
│   ├── sentry.module.ts       # Global Sentry module
│   ├── sentry.service.ts      # Sentry initialization and helper methods
│   ├── sentry.filter.ts       # Global exception filter
│   ├── sentry.types.ts        # Type definitions
│   └── index.ts               # Barrel exports
```

### Implementation Details

#### 1. Sentry Types (`src/sentry/sentry.types.ts`)

```typescript
/**
 * Sentry configuration options loaded from environment
 */
export interface SentryConfig {
  readonly dsn: string | undefined;
  readonly environment: string;
  readonly release: string | undefined;
  readonly tracesSampleRate: number;
  readonly profilesSampleRate: number;
  readonly enabled: boolean;
}
```

#### 2. Sentry Service (`src/sentry/sentry.service.ts`)

The service handles:
- Configuration loading from NestJS ConfigService
- Conditional Sentry initialization (only when DSN is provided)
- Helper methods for manual error capture
- User context setting

Key implementation notes:
- `isEnabled()` method returns `false` when DSN is not configured
- All capture methods check `isEnabled()` before calling Sentry APIs
- Initialize in `onModuleInit()` to ensure ConfigService is available

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { SentryConfig } from "./sentry.types";

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly config: SentryConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
  }

  onModuleInit(): void {
    if (this.config.enabled) {
      this.initializeSentry();
    }
  }

  private loadConfig(): SentryConfig {
    const dsn = this.configService.get<string>("SENTRY_DSN");
    return {
      dsn,
      environment: this.configService.get<string>("SENTRY_ENVIRONMENT") ??
                   this.configService.get<string>("NODE_ENV") ??
                   "development",
      release: this.configService.get<string>("SENTRY_RELEASE"),
      tracesSampleRate: parseFloat(
        this.configService.get<string>("SENTRY_TRACES_SAMPLE_RATE") ?? "0.1"
      ),
      profilesSampleRate: parseFloat(
        this.configService.get<string>("SENTRY_PROFILES_SAMPLE_RATE") ?? "0.1"
      ),
      enabled: !!dsn,
    };
  }

  private initializeSentry(): void {
    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: this.config.tracesSampleRate,
      profilesSampleRate: this.config.profilesSampleRate,
    });
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  captureException(exception: unknown): void {
    if (this.config.enabled) {
      Sentry.captureException(exception);
    }
  }

  setUser(user: { id: string; groups?: readonly string[] }): void {
    if (this.config.enabled) {
      Sentry.setUser({ id: user.id });
      if (user.groups) {
        Sentry.setContext("user", { groups: user.groups });
      }
    }
  }

  clearUser(): void {
    if (this.config.enabled) {
      Sentry.setUser(null);
    }
  }
}
```

#### 3. Sentry Exception Filter (`src/sentry/sentry.filter.ts`)

Global exception filter that:
- Captures all unhandled exceptions to Sentry
- Delegates to NestJS base exception filter for response handling
- No-ops when Sentry is not configured

```typescript
import { Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { SentryService } from "./sentry.service";

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly sentryService: SentryService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    // Capture to Sentry (no-op if not configured)
    this.sentryService.captureException(exception);

    // Delegate to base filter for response handling
    super.catch(exception, host);
  }
}
```

#### 4. Sentry Module (`src/sentry/sentry.module.ts`)

Global module providing Sentry functionality application-wide:

```typescript
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { SentryService } from "./sentry.service";
import { SentryExceptionFilter } from "./sentry.filter";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SentryService,
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
  exports: [SentryService],
})
export class SentryModule {}
```

#### 5. WebSocket Handler Wrapper (`src/sentry/sentry.lambda-wrapper.ts`)

Utility to wrap WebSocket Lambda handlers with Sentry error capture:

```typescript
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import * as Sentry from "@sentry/nestjs";

/**
 * Wraps a Lambda handler with Sentry error capture
 * @description Gracefully handles case when Sentry is not initialized
 * @remarks Uses process.env directly since this is a standalone utility without access to NestJS DI
 */
export function wrapLambdaHandler(
  handler: APIGatewayProxyHandler,
  handlerName: string
): APIGatewayProxyHandler {
  return async (event, context, callback): Promise<APIGatewayProxyResult> => {
    try {
      const result = await handler(event, context, callback);
      return result as APIGatewayProxyResult;
    } catch (error) {
      // Capture to Sentry if DSN is configured
      // Note: Using process.env directly since this utility runs outside NestJS context
      if (process.env.SENTRY_DSN) {
        Sentry.withScope(scope => {
          scope.setTag("handler", handlerName);
          scope.setContext("lambda", {
            functionName: context.functionName,
            requestId: context.awsRequestId,
          });
          Sentry.captureException(error);
        });

        // Flush events before Lambda freezes
        await Sentry.flush(2000);
      }

      throw error;
    }
  };
}
```

### Integration Points

#### 1. App Module (`src/app.module.ts`)

Import SentryModule as the **first** import to ensure early initialization:

```typescript
import { SentryModule } from "./sentry/sentry.module";

@Module({
  imports: [
    SentryModule, // Must be first for early initialization
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      // ... existing config
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

#### 2. Main Lambda Handler (`src/main.ts`)

No changes required to `main.ts`. Sentry initialization is handled by `SentryService.onModuleInit()` via the NestJS lifecycle.

**Note**: Errors that occur before NestJS module initialization (e.g., during module imports) will not be captured by Sentry. This is an acceptable trade-off for using NestJS's dependency injection and ConfigService pattern.

#### 3. WebSocket Handlers

Update handlers to use the wrapper for error capture:

```typescript
// src/websocket/handlers/connect.handler.ts
import { wrapLambdaHandler } from "../../sentry/sentry.lambda-wrapper";

const connectHandler: APIGatewayProxyHandler = async (event) => {
  // ... existing implementation
};

export const connect = wrapLambdaHandler(connectHandler, "wsConnect");
```

### Serverless Configuration

Add Sentry environment variables to `serverless.yml`:

```yaml
provider:
  environment:
    SENTRY_DSN: ${ssm:/thumbwar/${sls:stage}/sentry/dsn, ''}
    SENTRY_ENVIRONMENT: ${sls:stage}
    SENTRY_RELEASE: ${self:service}@${env:COMMIT_SHA, 'local'}
    SENTRY_TRACES_SAMPLE_RATE: ${ssm:/thumbwar/${sls:stage}/sentry/traces-sample-rate, '0.1'}
    SENTRY_PROFILES_SAMPLE_RATE: ${ssm:/thumbwar/${sls:stage}/sentry/profiles-sample-rate, '0.1'}
```

### Source Maps

Configure serverless-esbuild to upload source maps (optional enhancement):

```yaml
custom:
  esbuild:
    sourcemap: true
    # Source maps are already enabled, Sentry will use them automatically
```

## Testing Strategy

### Unit Tests

1. **SentryService tests** (`src/sentry/sentry.service.test.ts`):
   - Test `isEnabled()` returns `false` when DSN not set
   - Test `isEnabled()` returns `true` when DSN is set
   - Test `captureException()` is no-op when disabled
   - Test configuration loading with various env var combinations

2. **SentryExceptionFilter tests** (`src/sentry/sentry.filter.test.ts`):
   - Test exception is captured and passed to base filter
   - Test filter works when Sentry is disabled

3. **Lambda wrapper tests** (`src/sentry/sentry.lambda-wrapper.test.ts`):
   - Test successful handler execution passes through
   - Test error capture on handler failure
   - Test graceful handling when Sentry not initialized

### Integration Tests

1. Verify application starts successfully without SENTRY_DSN
2. Verify application starts successfully with SENTRY_DSN
3. Verify errors are captured when Sentry is configured

## Acceptance Criteria

1. [ ] Application starts and functions normally without SENTRY_DSN configured
2. [ ] Application starts and functions normally with SENTRY_DSN configured
3. [ ] Unhandled exceptions in GraphQL resolvers are captured to Sentry
4. [ ] Unhandled exceptions in WebSocket handlers are captured to Sentry
5. [ ] User context is attached to errors when user is authenticated
6. [ ] Environment is correctly tagged on all events
7. [ ] All unit tests pass
8. [ ] Lint and type checks pass
9. [ ] No breaking changes to existing functionality

## Rollout Plan

1. **Local Development**: Test with `SENTRY_DSN` unset to verify graceful degradation
2. **Development Environment**: Deploy with DSN configured, verify error capture
3. **Staging Environment**: Monitor for performance impact, adjust sample rates
4. **Production Environment**: Deploy with conservative sample rates (0.1)

## Future Enhancements (Out of Scope)

- Apollo Server plugin for GraphQL-specific context
- Custom breadcrumbs for database operations
- Performance monitoring dashboards
- Alert configuration in Sentry
