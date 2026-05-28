# Local Development Environment Spec

## Overview

Add an alternate entry point (`main-local.ts`) for local development via Docker Compose, eliminating the need for serverless-offline. This includes abstracting WebSocket functionality using the same facade pattern established for Cognito authentication.

## Background

The current entry point (`main.ts`) is optimized for AWS Lambda:
- Wraps NestJS in `@vendia/serverless-express` for Lambda's event/context model
- Initializes X-Ray tracing for AWS observability
- Uses Lambda warm-start caching pattern

For local development, a standard NestJS HTTP server is simpler, faster, and integrates better with Docker Compose.

## Requirements

### Functional Requirements

1. **Alternate Entry Point**: Create `main-local.ts` that starts a standard NestJS HTTP server using `app.listen()`.

2. **WebSocket Abstraction**: Implement a facade pattern for WebSocket functionality that:
   - Uses AWS API Gateway WebSockets in Lambda (production)
   - Uses standard WebSocket server locally (development)
   - Follows the established Cognito facade pattern

3. **Docker Compose Integration**: The local entry point must work seamlessly with Docker Compose for multi-service local development.

4. **Feature Parity**: Local development must support all features:
   - GraphQL queries and mutations
   - GraphQL subscriptions (via standard WebSockets)
   - Authentication (via existing LocalAuthService)

### Non-Functional Requirements

1. Same `AppModule` used by both entry points - no code duplication
2. X-Ray tracing gracefully disabled in local mode
3. Minimal configuration differences between local and Lambda
4. Hot reload support for faster development iteration

## Technical Design

### File Structure

```text
src/
├── main.ts                    # Lambda entry point (existing)
├── main-local.ts              # Local development entry point (new)
├── tracing.ts                 # X-Ray initialization (existing, needs update)
├── websocket/
│   ├── interfaces/
│   │   └── websocket-gateway.interface.ts    # WebSocket gateway interface
│   ├── services/
│   │   └── local-websocket.service.ts        # Local WebSocket implementation
│   ├── providers/
│   │   └── websocket-gateway.provider.ts     # Factory provider
│   ├── handlers/              # Existing Lambda handlers (unchanged)
│   └── shared/                # Existing shared clients (unchanged)
├── subscription/
│   ├── pubsub/
│   │   ├── valkey-pubsub.ts           # Existing AWS implementation
│   │   └── local-pubsub.ts            # Local PubSub implementation (new)
│   └── providers/
│       └── pubsub.provider.ts         # Factory provider (new)
```

### 1. Local Entry Point (`src/main-local.ts`)

```typescript
/**
 * @file main-local.ts
 * @description Local development entry point for Docker Compose
 * @module main-local
 */

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/**
 * Bootstrap the NestJS application for local development
 * @description Starts a standard HTTP server without Lambda/serverless wrapper
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });

  const port = 3000;
  await app.listen(port);

  console.log(`Application running on http://localhost:${port}`);
  console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
```

### 2. X-Ray Graceful Degradation (`src/tracing.ts`)

Update the existing tracing module to no-op when running locally:

```typescript
/**
 * Initialize AWS X-Ray tracing
 * @description No-ops when IS_OFFLINE is true for local development
 */
export function initializeXRay(): void {
  // Skip X-Ray in local development
  if (process.env.IS_OFFLINE === "true") {
    return;
  }

  // Existing X-Ray initialization...
}
```

### 3. WebSocket Gateway Interface (`src/websocket/interfaces/websocket-gateway.interface.ts`)

```typescript
/**
 * WebSocket gateway interface for sending messages to connected clients
 * @description Abstracts the difference between API Gateway WebSockets and local WebSocket server
 */
export interface IWebSocketGateway {
  /**
   * Send a message to a specific connection
   * @param connectionId - The unique connection identifier
   * @param data - The data to send (will be JSON serialized)
   * @returns Promise that resolves when message is sent
   */
  sendToConnection(connectionId: string, data: unknown): Promise<void>;

  /**
   * Remove a stale connection
   * @param connectionId - The connection to remove
   * @returns Promise that resolves when connection is cleaned up
   */
  removeConnection(connectionId: string): Promise<void>;
}

/** Injection token for WebSocket gateway */
export const WEBSOCKET_GATEWAY = Symbol("WEBSOCKET_GATEWAY");
```

### 4. Local WebSocket Service (`src/websocket/services/local-websocket.service.ts`)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { WebSocketServer, WebSocket } from "ws";
import { IWebSocketGateway } from "../interfaces/websocket-gateway.interface";

/**
 * Local WebSocket service for development
 * @description Manages WebSocket connections using standard ws library
 */
@Injectable()
export class LocalWebSocketService
  implements IWebSocketGateway, OnModuleInit, OnModuleDestroy
{
  private wss: WebSocketServer | null = null;
  private readonly connections = new Map<string, WebSocket>();

  onModuleInit(): void {
    this.wss = new WebSocketServer({ port: 3001 });

    this.wss.on("connection", (ws: WebSocket) => {
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, ws);

      ws.on("close", () => {
        this.connections.delete(connectionId);
      });

      // Handle graphql-ws protocol messages
      ws.on("message", (data: Buffer) => {
        this.handleMessage(connectionId, ws, data);
      });
    });

    console.log("WebSocket server running on ws://localhost:3001");
  }

  onModuleDestroy(): void {
    this.wss?.close();
  }

  async sendToConnection(connectionId: string, data: unknown): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    const ws = this.connections.get(connectionId);
    ws?.close();
    this.connections.delete(connectionId);
  }

  private generateConnectionId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleMessage(
    connectionId: string,
    ws: WebSocket,
    data: Buffer
  ): void {
    // Implement graphql-ws protocol handling similar to default.handler.ts
    // connection_init, subscribe, complete, ping/pong
  }
}
```

### 5. API Gateway WebSocket Service (`src/websocket/services/api-gateway-websocket.service.ts`)

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IWebSocketGateway } from "../interfaces/websocket-gateway.interface";
import { sendToConnection } from "../shared/api-gateway-client";
import { removeConnection } from "../shared/valkey-client";
import { Configuration } from "../../config/configuration";

/**
 * API Gateway WebSocket service for Lambda deployment
 * @description Wraps existing API Gateway Management API client
 */
@Injectable()
export class ApiGatewayWebSocketService implements IWebSocketGateway {
  constructor(
    private readonly configService: ConfigService<Configuration, true>
  ) {}

  async sendToConnection(connectionId: string, data: unknown): Promise<void> {
    const endpoint = this.configService.get("websocket.apiEndpoint", {
      infer: true,
    });
    if (!endpoint) {
      throw new Error("WebSocket API endpoint not configured");
    }

    // Parse endpoint to extract domain and stage
    const url = new URL(endpoint);
    const domainName = url.hostname;
    const stage = url.pathname.replace("/", "");

    await sendToConnection(connectionId, domainName, stage, data);
  }

  async removeConnection(connectionId: string): Promise<void> {
    await removeConnection(connectionId);
  }
}
```

### 6. WebSocket Gateway Provider (`src/websocket/providers/websocket-gateway.provider.ts`)

```typescript
import { ConfigService } from "@nestjs/config";
import {
  IWebSocketGateway,
  WEBSOCKET_GATEWAY,
} from "../interfaces/websocket-gateway.interface";
import { ApiGatewayWebSocketService } from "../services/api-gateway-websocket.service";
import { LocalWebSocketService } from "../services/local-websocket.service";

/**
 * Factory provider for WebSocket gateway
 * @description Selects implementation based on IS_OFFLINE environment variable
 */
export const websocketGatewayProvider = {
  provide: WEBSOCKET_GATEWAY,
  useFactory: (
    configService: ConfigService,
    apiGatewayService: ApiGatewayWebSocketService,
    localService: LocalWebSocketService
  ): IWebSocketGateway => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localService : apiGatewayService;
  },
  inject: [ConfigService, ApiGatewayWebSocketService, LocalWebSocketService],
};
```

### 7. Local PubSub Implementation (`src/subscription/pubsub/local-pubsub.ts`)

```typescript
import { Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { SubscriptionFilters } from "./valkey-pubsub";

/**
 * Local PubSub implementation using in-memory graphql-subscriptions
 * @description Standard PubSub for local development - connections held in memory
 */
@Injectable()
export class LocalPubSub extends PubSub {
  /**
   * Publish a created event
   * @param resourceType - The type of resource created
   * @param data - The created resource data
   * @param _filters - Filters (unused in local mode, included for interface parity)
   */
  async publishCreated<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    const triggerName = `On${resourceType}Created`;
    await this.publish(triggerName, { [`${resourceType.toLowerCase()}Created`]: data });
  }

  /**
   * Publish an updated event
   * @param resourceType - The type of resource updated
   * @param data - The updated resource data
   * @param _filters - Filters (unused in local mode)
   */
  async publishUpdated<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    const triggerName = `On${resourceType}Updated`;
    await this.publish(triggerName, { [`${resourceType.toLowerCase()}Updated`]: data });
  }

  /**
   * Publish a deleted event
   * @param resourceType - The type of resource deleted
   * @param data - The deleted resource data
   * @param _filters - Filters (unused in local mode)
   */
  async publishDeleted<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    const triggerName = `On${resourceType}Deleted`;
    await this.publish(triggerName, { [`${resourceType.toLowerCase()}Deleted`]: data });
  }
}
```

### 8. PubSub Provider (`src/subscription/providers/pubsub.provider.ts`)

```typescript
import { ConfigService } from "@nestjs/config";
import { ValkeyPubSub } from "../pubsub/valkey-pubsub";
import { LocalPubSub } from "../pubsub/local-pubsub";
import { PUB_SUB } from "../subscription.module";

/**
 * Factory provider for PubSub
 * @description Selects ValkeyPubSub for Lambda or LocalPubSub for local development
 */
export const pubSubProvider = {
  provide: PUB_SUB,
  useFactory: (
    configService: ConfigService,
    valkeyPubSub: ValkeyPubSub,
    localPubSub: LocalPubSub
  ): ValkeyPubSub | LocalPubSub => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localPubSub : valkeyPubSub;
  },
  inject: [ConfigService, ValkeyPubSub, LocalPubSub],
};
```

### 9. Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.local
    ports:
      - "3000:3000"   # HTTP/GraphQL
      - "3001:3001"   # WebSocket
    environment:
      - IS_OFFLINE=true
      - NODE_ENV=development
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=thumbwar
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=postgres
      - VALKEY_HOST=valkey
      - VALKEY_PORT=6379
    volumes:
      - ./src:/app/src:ro
    depends_on:
      - postgres
      - valkey
    command: ["bun", "run", "src/main-local.ts"]

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: thumbwar
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  valkey:
    image: valkey/valkey:8-alpine
    ports:
      - "6379:6379"
    volumes:
      - valkey_data:/data

volumes:
  postgres_data:
  valkey_data:
```

### 10. Local Dockerfile (`Dockerfile.local`)

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000 3001

CMD ["bun", "run", "src/main-local.ts"]
```

## Module Updates

### WebSocket Module (`src/websocket/websocket.module.ts`)

```typescript
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApiGatewayWebSocketService } from "./services/api-gateway-websocket.service";
import { LocalWebSocketService } from "./services/local-websocket.service";
import { websocketGatewayProvider } from "./providers/websocket-gateway.provider";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ApiGatewayWebSocketService,
    LocalWebSocketService,
    websocketGatewayProvider,
  ],
  exports: [WEBSOCKET_GATEWAY],
})
export class WebSocketModule {}
```

### Subscription Module Updates (`src/subscription/subscription.module.ts`)

Update to use the factory provider pattern:

```typescript
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ValkeyPubSub } from "./pubsub/valkey-pubsub";
import { LocalPubSub } from "./pubsub/local-pubsub";
import { pubSubProvider } from "./providers/pubsub.provider";

export const PUB_SUB = Symbol("PUB_SUB");

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ValkeyPubSub, LocalPubSub, pubSubProvider],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
```

## Package Dependencies

Add the `ws` package for local WebSocket server:

```bash
bun add ws
bun add -d @types/ws
```

## Scripts (`package.json`)

Add new scripts for local development:

```json
{
  "scripts": {
    "start:docker": "docker-compose up",
    "start:docker:build": "docker-compose up --build",
    "start:docker:down": "docker-compose down"
  }
}
```

## Environment Configuration

### Local Development (`.env.local`)

```bash
IS_OFFLINE=true
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=thumbwar
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Valkey/Redis
VALKEY_HOST=localhost
VALKEY_PORT=6379

# Optional: Sentry (disabled locally by default)
# SENTRY_DSN=
```

## Comparison: Lambda vs Local

| Aspect | Lambda (`main.ts`) | Local (`main-local.ts`) |
|--------|-------------------|------------------------|
| Entry Point | serverless-express wrapper | `app.listen()` |
| HTTP Server | API Gateway → Lambda | Express directly |
| WebSocket | API Gateway WebSocket API | Standard ws server |
| PubSub | ValkeyPubSub + API Gateway | LocalPubSub (in-memory) |
| Auth | Cognito via AuthService | LocalAuthService |
| Tracing | X-Ray enabled | X-Ray no-op |
| Connection State | Valkey (external) | In-memory Map |

## Testing Strategy

### Unit Tests

1. **LocalWebSocketService tests**:
   - Test connection management
   - Test message sending
   - Test graphql-ws protocol handling

2. **LocalPubSub tests**:
   - Test publish methods
   - Test asyncIterator returns valid iterator

3. **Provider tests**:
   - Test factory returns correct implementation based on IS_OFFLINE

### Integration Tests

1. Verify both entry points start successfully
2. Verify GraphQL queries work in both modes
3. Verify subscriptions work in local mode
4. Verify auth works with LocalAuthService

## Acceptance Criteria

1. [ ] `main-local.ts` starts a working NestJS server on port 3000
2. [ ] WebSocket server runs on port 3001 in local mode
3. [ ] GraphQL subscriptions work via standard WebSocket locally
4. [ ] X-Ray initialization is skipped when IS_OFFLINE=true
5. [ ] Docker Compose successfully orchestrates all services
6. [ ] Existing Lambda deployment continues to work unchanged
7. [ ] All existing tests pass
8. [ ] Lint and type checks pass

## Migration Notes

- No changes required to existing resolvers or services
- Lambda handlers remain unchanged
- Existing Valkey client works in both modes (connection state management)
- LocalAuthService already exists and will be used automatically

## Future Enhancements (Out of Scope)

- Hot module replacement (HMR) for faster iteration
- GraphQL Playground authentication integration
- Local Cognito emulator (LocalStack)
- Database seeding scripts for Docker Compose
