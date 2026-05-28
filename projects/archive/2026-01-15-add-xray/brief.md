# Complete AWS X-Ray Implementation Specification

## Overview

This specification details how to implement comprehensive AWS X-Ray distributed tracing for the thumbwar backend. The goal is to enable identification of **any** performance bottleneck in the application by tracing all significant operations.

## Background

### Current State

The project has **limited** X-Ray implementation:

- **TypeORM X-Ray Logger** (`src/database/typeorm-xray-logger.ts`): Creates subsegments for database queries
- **Missing**: X-Ray SDK initialization, serverless.yml configuration, IAM permissions, GraphQL tracing, HTTP client tracing, WebSocket handler tracing

### Why Complete X-Ray Coverage?

Without complete tracing, bottlenecks in the following areas remain invisible:

1. Cold start initialization time
2. GraphQL resolver execution
3. External HTTP calls (e.g., Cognito, third-party APIs)
4. WebSocket handler latency
5. Valkey/Redis operations
6. Authentication/authorization overhead

## Architecture Decision: X-Ray SDK vs OpenTelemetry

### Critical Timeline Information

AWS has announced X-Ray SDK deprecation:

- **February 25, 2026**: X-Ray SDK enters maintenance mode
- **February 25, 2027**: X-Ray SDK discontinued

### Recommendation: Use X-Ray SDK Now, Plan OpenTelemetry Migration Later

**Rationale:**

1. **Existing Investment**: TypeORM X-Ray logger already uses X-Ray SDK
2. **Time to Value**: X-Ray SDK is simpler to implement, provides immediate value
3. **Migration Path**: OpenTelemetry traces can be sent to X-Ray backend (no data loss)
4. **Timeline**: 12+ months before maintenance mode; we can implement now and migrate later

**Future Migration**: Create a separate spec for OpenTelemetry migration in Q4 2025.

## Goals

1. **Trace all Lambda handlers**: main, wsConnect, wsDisconnect, wsDefault, wsAuthorizer
2. **Trace all GraphQL operations**: queries, mutations, subscriptions
3. **Trace all database operations**: Already implemented via TypeORM logger (needs initialization)
4. **Trace all HTTP outbound calls**: Cognito SDK calls, any future external APIs
5. **Trace Valkey/Redis operations**: Cache hits/misses, connection latency
6. **Provide utility for custom tracing**: Easy-to-use function for ad-hoc subsegments

## Non-Goals

1. Client-side tracing (frontend)
2. Sampling configuration (use AWS defaults initially)
3. Custom X-Ray daemon deployment (use Lambda's built-in daemon)
4. OpenTelemetry migration (separate spec)

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Install Dependencies

```bash
bun add aws-xray-sdk-core
```

Note: `aws-xray-sdk-core` is lighter than `aws-xray-sdk` (which includes postgres, mysql, etc. that we don't need).

#### 1.2 Update serverless.yml

Add X-Ray tracing configuration and IAM permissions:

```yaml
provider:
  name: aws
  runtime: nodejs22.x
  region: us-east-1
  # Add X-Ray tracing
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        # Existing permissions...
        - Effect: Allow
          Action:
            - 'xray:PutTraceSegments'
            - 'xray:PutTelemetryRecords'
          Resource: '*'
```

#### 1.3 Create X-Ray Configuration Module

Create `src/tracing/xray.config.ts`:

```typescript
/**
 * @file xray.config.ts
 * @description AWS X-Ray SDK initialization and configuration
 * @module tracing
 *
 * @remarks
 * This module initializes X-Ray at application startup. It must be imported
 * BEFORE any modules that use traced clients (http, https, pg).
 *
 * In Lambda, X-Ray automatically creates a facade segment. This module
 * configures context handling and patches supported libraries.
 */
import * as AWSXRay from "aws-xray-sdk-core";
import { Logger } from "@nestjs/common";

const logger = new Logger("XRayConfig");

/**
 * Initialize AWS X-Ray SDK for Lambda environment.
 *
 * @description Configures X-Ray with appropriate settings for Lambda:
 * - Sets context missing strategy to LOG_ERROR (prevents crashes when context unavailable)
 * - Patches HTTP/HTTPS for automatic outbound request tracing
 * - Configures streaming threshold to handle large traces
 */
export const initializeXRay = (): void => {
  const isOffline = process.env.IS_OFFLINE === "true";

  if (isOffline) {
    logger.log("X-Ray disabled in offline mode");
    return;
  }

  try {
    // Prevent crashes when X-Ray context is unavailable (e.g., during cold start init)
    AWSXRay.setContextMissingStrategy("LOG_ERROR");

    // Patch HTTP/HTTPS modules for automatic outbound request tracing
    // This MUST happen before any HTTP clients are imported
    AWSXRay.captureHTTPsGlobal(require("http"));
    AWSXRay.captureHTTPsGlobal(require("https"));

    // Enable Promise context propagation
    AWSXRay.capturePromise();

    // Set streaming threshold to 0 to prevent 64KB segment size issues with GraphQL
    AWSXRay.setStreamingThreshold(0);

    logger.log("X-Ray initialized successfully");
  } catch (error) {
    logger.warn(`X-Ray initialization failed: ${error.message}`);
  }
};

/**
 * Get the current X-Ray segment or null if unavailable.
 *
 * @returns The current segment or null
 */
export const getXRaySegment = (): AWSXRay.Segment | AWSXRay.Subsegment | null => {
  try {
    return AWSXRay.getSegment();
  } catch {
    return null;
  }
};

/**
 * Get the X-Ray namespace for async context propagation.
 *
 * @returns The X-Ray namespace or null
 */
export const getXRayNamespace = (): AWSXRay.Namespace | null => {
  try {
    return AWSXRay.getNamespace();
  } catch {
    return null;
  }
};

// Re-export AWSXRay for direct access when needed
export { AWSXRay };
```

#### 1.4 Create Tracing Utility Module

Create `src/tracing/with-subsegment.ts`:

```typescript
/**
 * @file with-subsegment.ts
 * @description Utility function for creating X-Ray subsegments with proper error handling
 * @module tracing
 *
 * @remarks
 * Use this utility when you need to trace custom operations that aren't
 * automatically instrumented (e.g., complex business logic, third-party SDK calls).
 */
import { Logger } from "@nestjs/common";
import { getXRayNamespace, getXRaySegment } from "./xray.config";

const logger = new Logger("XRayTracing");

/**
 * Options for subsegment creation.
 */
interface SubsegmentOptions {
  /**
   * Annotations are indexed and searchable in X-Ray console.
   * Use for values you want to filter/search by.
   * Max 50 annotations per trace.
   */
  annotations?: Record<string, string | number | boolean>;

  /**
   * Metadata is not indexed but can store complex objects.
   * Use for debugging data you don't need to search.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Execute an async operation within an X-Ray subsegment.
 *
 * @description
 * Wraps an async function with X-Ray tracing, automatically:
 * - Creating a subsegment with the given name
 * - Adding annotations and metadata
 * - Recording errors if the operation fails
 * - Closing the subsegment on completion
 *
 * If X-Ray is unavailable (local dev, missing context), the function
 * executes normally without tracing.
 *
 * @param name - Subsegment name (e.g., "Cognito:GetUser", "Valkey:Get")
 * @param fn - Async function to execute
 * @param options - Optional annotations and metadata
 * @returns The result of the async function
 *
 * @example
 * ```typescript
 * const user = await withXRaySubsegment(
 *   "Cognito:GetUser",
 *   () => cognitoClient.getUser({ AccessToken: token }),
 *   { annotations: { userId: "123" } }
 * );
 * ```
 */
export const withXRaySubsegment = async <T>(
  name: string,
  fn: () => Promise<T>,
  options: SubsegmentOptions = {}
): Promise<T> => {
  const namespace = getXRayNamespace();

  if (!namespace) {
    return fn();
  }

  return namespace.runAndReturn(async () => {
    const segment = getXRaySegment();

    if (!segment) {
      return fn();
    }

    let subsegment = null;

    try {
      subsegment = segment.addNewSubsegment(name);
    } catch (error) {
      logger.warn(`Failed to create subsegment "${name}": ${error.message}`);
      return fn();
    }

    try {
      // Add annotations (searchable)
      if (options.annotations) {
        Object.entries(options.annotations).forEach(([key, value]) => {
          try {
            subsegment.addAnnotation(key, value);
          } catch {
            // Silently ignore annotation failures
          }
        });
      }

      // Add metadata (not searchable, for debugging)
      if (options.metadata) {
        try {
          subsegment.addMetadata("details", options.metadata);
        } catch {
          // Silently ignore metadata failures
        }
      }

      const result = await fn();
      return result;
    } catch (error) {
      try {
        subsegment?.addError(error);
      } catch {
        // Silently ignore error recording failures
      }
      throw error;
    } finally {
      try {
        if (subsegment && !subsegment.isClosed()) {
          subsegment.close();
        }
      } catch (closeError) {
        logger.warn(`Error closing subsegment "${name}": ${closeError.message}`);
      }
    }
  });
};
```

#### 1.5 Create Tracing Module Barrel Export

Create `src/tracing/index.ts`:

```typescript
/**
 * @file index.ts
 * @description Barrel export for tracing utilities
 * @module tracing
 */

export { initializeXRay, getXRaySegment, getXRayNamespace, AWSXRay } from "./xray.config";
export { withXRaySubsegment } from "./with-subsegment";
```

### Phase 2: Lambda Handler Integration

#### 2.1 Update Main Lambda Handler

Update `src/main.ts` to initialize X-Ray before NestJS:

```typescript
/**
 * @file main.ts
 * @description Lambda handler entry point for serverless deployment
 * @module main
 */

// CRITICAL: Initialize X-Ray FIRST, before any other imports that use HTTP
import { initializeXRay } from "./tracing";
initializeXRay();

import { NestFactory } from "@nestjs/core";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import { Context, Callback } from "aws-lambda";
import { AppModule } from "./app.module";

// ... rest of file unchanged
```

#### 2.2 Update WebSocket Handlers

Each WebSocket handler should initialize X-Ray. Update `src/websocket/handlers/connect.handler.ts` (and similarly for disconnect, default):

```typescript
// At the top of the file, before other imports
import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

// ... existing imports

export const connect = async (
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<...>,
  context: Context
): Promise<...> => {
  return withXRaySubsegment("WebSocket:Connect", async () => {
    // ... existing handler logic
  }, {
    annotations: {
      connectionId: event.requestContext.connectionId,
    },
  });
};
```

#### 2.3 Update WebSocket Authorizer

Update `src/websocket/authorizer/index.ts`:

```typescript
import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

// ... existing code

export const wsAuthorizer = async (event, context) => {
  return withXRaySubsegment("WebSocket:Authorize", async () => {
    // ... existing logic
  }, {
    annotations: {
      route: event.requestContext.routeKey,
    },
  });
};
```

### Phase 3: GraphQL Tracing

#### 3.1 Create GraphQL Operation Logging Plugin

Create `src/graphql/operation-logging.plugin.ts`:

```typescript
/**
 * @file operation-logging.plugin.ts
 * @description Apollo Server plugin for GraphQL operation X-Ray tracing
 * @module graphql
 *
 * @remarks
 * This plugin creates X-Ray subsegments for each GraphQL operation,
 * capturing operation name, type (query/mutation), duration, and errors.
 */
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from "@apollo/server";
import { Logger } from "@nestjs/common";
import { Plugin } from "@nestjs/apollo";
import { DocumentNode, OperationDefinitionNode } from "graphql";
import { getXRaySegment } from "../tracing";

/**
 * GraphQL request context with document and errors.
 */
interface RequestContext {
  request?: { operationName?: string };
  errors?: readonly Error[];
  document?: DocumentNode;
}

/**
 * Apollo Server plugin that traces GraphQL operations with AWS X-Ray.
 *
 * @description
 * For each GraphQL request, this plugin:
 * - Creates a subsegment named "GraphQL:{operationName}"
 * - Records operation duration
 * - Captures any errors that occur
 * - Adds annotations for filtering in X-Ray console
 */
@Plugin()
export class OperationLoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger("GraphQL");

  /**
   * Called at the start of each GraphQL request.
   */
  requestDidStart(): GraphQLRequestListener<unknown> {
    const startTime = Date.now();

    return {
      /**
       * Called just before the response is sent.
       */
      willSendResponse: async ({
        request,
        errors,
        document,
      }: RequestContext): Promise<void> => {
        const duration = Date.now() - startTime;
        const operationName = this.extractOperationName(request, document);
        const operationType = this.extractOperationType(document);
        const hasErrors = Boolean(errors?.length);

        // Log to CloudWatch
        if (hasErrors) {
          this.logger.error(
            `${operationType}:${operationName} failed in ${duration}ms`
          );
          errors?.forEach(error => {
            this.logger.error(`Error: ${error.message}`);
          });
        } else {
          this.logger.log(
            `${operationType}:${operationName} completed in ${duration}ms`
          );
        }

        // Add X-Ray tracing
        this.addXRayAnnotations(operationName, operationType, duration, hasErrors, errors);
      },
    };
  }

  /**
   * Extract operation name from request or document.
   */
  private extractOperationName(
    request?: { operationName?: string },
    document?: DocumentNode
  ): string {
    if (request?.operationName) {
      return request.operationName;
    }

    const definition = document?.definitions.find(
      (def): def is OperationDefinitionNode =>
        def.kind === "OperationDefinition" && Boolean(def.name)
    );

    return definition?.name?.value ?? "anonymous";
  }

  /**
   * Extract operation type (query, mutation, subscription) from document.
   */
  private extractOperationType(document?: DocumentNode): string {
    const definition = document?.definitions.find(
      (def): def is OperationDefinitionNode =>
        def.kind === "OperationDefinition"
    );

    return definition?.operation ?? "unknown";
  }

  /**
   * Add X-Ray annotations for the GraphQL operation.
   */
  private addXRayAnnotations(
    operationName: string,
    operationType: string,
    duration: number,
    hasErrors: boolean,
    errors?: readonly Error[]
  ): void {
    try {
      const segment = getXRaySegment();
      if (!segment) return;

      const subsegment = segment.addNewSubsegment(`GraphQL:${operationName}`);

      try {
        subsegment.addAnnotation("graphql.operation", operationName);
        subsegment.addAnnotation("graphql.type", operationType);
        subsegment.addAnnotation("graphql.duration_ms", duration);
        subsegment.addAnnotation("graphql.has_errors", hasErrors);

        subsegment.addMetadata("graphql", {
          operationName,
          operationType,
          durationMs: duration,
          hasErrors,
        });

        if (hasErrors && errors) {
          errors.forEach(error => {
            subsegment.addError(error);
          });
        }
      } finally {
        if (!subsegment.isClosed()) {
          subsegment.close();
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to add X-Ray annotations: ${error.message}`);
    }
  }
}
```

#### 3.2 Register Plugin in AppModule

Update `src/app.module.ts`:

```typescript
import { OperationLoggingPlugin } from "./graphql/operation-logging.plugin";

@Module({
  // ...
  providers: [ComplexityPlugin, OperationLoggingPlugin],
})
export class AppModule {}
```

### Phase 4: Service-Level Tracing

#### 4.1 Valkey Service Tracing

Update Valkey service methods to use `withXRaySubsegment`:

```typescript
import { withXRaySubsegment } from "../tracing";

@Injectable()
export class ValkeyService {
  async get(key: string): Promise<string | null> {
    return withXRaySubsegment("Valkey:Get", async () => {
      return this.client.get(key);
    }, {
      annotations: { "valkey.operation": "GET" },
      metadata: { key },
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    return withXRaySubsegment("Valkey:Set", async () => {
      if (ttl) {
        await this.client.set(key, value, "EX", ttl);
      } else {
        await this.client.set(key, value);
      }
    }, {
      annotations: { "valkey.operation": "SET" },
      metadata: { key, ttl },
    });
  }
}
```

#### 4.2 Auth Service Tracing

The Cognito SDK calls will be automatically traced because we patched HTTP/HTTPS globally. However, for explicit tracing:

```typescript
import { withXRaySubsegment } from "../tracing";

@Injectable()
export class AuthService {
  async verifyToken(token: string): Promise<CognitoUser> {
    return withXRaySubsegment("Auth:VerifyToken", async () => {
      // ... existing verification logic
    }, {
      annotations: { "auth.action": "verify_token" },
    });
  }
}
```

### Phase 5: Fix Existing TypeORM Logger

The existing TypeORM X-Ray logger uses dynamic `require()` which may not work correctly. Update to use the initialized X-Ray from our tracing module.

Update `src/database/typeorm-xray-logger.ts`:

```typescript
// Replace the getXRayNamespace function
import { getXRayNamespace, getXRaySegment } from "../tracing";

// Remove the dynamic require and use the imported functions
private createSubsegment(name: string): XRaySubsegment | null {
  try {
    const segment = getXRaySegment();
    return segment?.addNewSubsegment(name) ?? null;
  } catch {
    return null;
  }
}
```

## File Structure After Implementation

```
src/
├── tracing/
│   ├── index.ts                    # Barrel export
│   ├── xray.config.ts              # X-Ray initialization
│   └── with-subsegment.ts          # Utility function
├── graphql/
│   ├── complexity.plugin.ts        # Existing
│   └── operation-logging.plugin.ts # NEW: GraphQL tracing
├── database/
│   └── typeorm-xray-logger.ts      # UPDATE: Use shared X-Ray config
├── main.ts                         # UPDATE: Initialize X-Ray first
└── websocket/
    ├── handlers/
    │   ├── connect.handler.ts      # UPDATE: Add tracing
    │   ├── disconnect.handler.ts   # UPDATE: Add tracing
    │   └── default.handler.ts      # UPDATE: Add tracing
    └── authorizer/
        └── index.ts                # UPDATE: Add tracing
```

## Testing Strategy

### Unit Tests

1. **xray.config.ts**: Mock `aws-xray-sdk-core`, verify initialization calls
2. **with-subsegment.ts**: Test graceful degradation when X-Ray unavailable
3. **operation-logging.plugin.ts**: Mock X-Ray SDK, verify annotations

### Integration Tests

1. Run locally with `IS_OFFLINE=true`, verify no X-Ray errors
2. Deploy to dev, verify traces appear in X-Ray console
3. Trigger intentional errors, verify error traces recorded

### Manual Verification Checklist

- [ ] Cold start visible in X-Ray trace
- [ ] GraphQL operation names visible
- [ ] Database queries visible with table names
- [ ] HTTP outbound calls visible (Cognito)
- [ ] WebSocket operations visible
- [ ] Errors properly recorded with stack traces
- [ ] Slow operations identifiable

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IS_OFFLINE` | Disables X-Ray in local development | `false` |
| `AWS_XRAY_CONTEXT_MISSING` | Error handling strategy | `LOG_ERROR` |

## Performance Considerations

1. **Overhead**: X-Ray adds <2% latency overhead
2. **Streaming Threshold**: Set to 0 to avoid 64KB segment limit issues
3. **Sampling**: Use AWS default sampling (1/sec + 5% additional)
4. **Cold Starts**: X-Ray initialization adds ~10-20ms to cold start

## Security Considerations

1. **No PII in Annotations**: Only use IDs, never names/emails
2. **Query Sanitization**: TypeORM logger already sanitizes parameters
3. **IAM Least Privilege**: Only `xray:PutTraceSegments` and `xray:PutTelemetryRecords`

## Rollout Plan

1. **Week 1**: Implement Phase 1-2 (infrastructure, main handler)
2. **Week 2**: Implement Phase 3 (GraphQL tracing)
3. **Week 3**: Implement Phase 4-5 (service tracing, fix TypeORM logger)
4. **Week 4**: Testing, documentation, monitoring setup

## Success Metrics

1. **Coverage**: 100% of Lambda invocations traced
2. **Visibility**: All database queries visible in traces
3. **Error Detection**: All errors captured with stack traces
4. **Latency Analysis**: Ability to identify P95 latency by operation
5. **Cold Start Tracking**: Cold starts visible and measurable

## Future Considerations

### OpenTelemetry Migration (Q4 2025)

Given X-Ray SDK deprecation (Feb 2026 maintenance mode), plan migration to OpenTelemetry:

1. Replace `aws-xray-sdk-core` with `@opentelemetry/sdk-node`
2. Use `@opentelemetry/auto-instrumentations-node` for automatic tracing
3. Use `@opentelemetry/propagator-aws-xray` to send traces to X-Ray backend
4. Maintain same tracing coverage with vendor-neutral API

### Enhanced Tracing

1. **DataLoader tracing**: Trace batch loading operations
2. **Resolver-level tracing**: Individual field resolver timing
3. **Custom metrics**: Business metrics alongside traces
4. **Alerting**: CloudWatch alarms based on X-Ray insights

## References

- [AWS X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html)
- [AWS Lambda X-Ray Integration](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html)
- [Serverless Framework X-Ray Configuration](https://www.serverless.com/framework/docs/providers/aws/guide/functions#tracing)
- [X-Ray to OpenTelemetry Migration Guide](https://docs.aws.amazon.com/xray/latest/devguide/migrate-xray-to-opentelemetry-nodejs.html)
- [Reference Implementation: sample-project/backend-v2](~/workspace/sample-project/backend-v2/)
