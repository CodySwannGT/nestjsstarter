# API Gateway WebSocket Facade Spec

## Overview

Add local WebSocket server support for GraphQL subscriptions during development. Uses the same facade pattern as the Cognito auth service (`src/auth/providers/auth-service.provider.ts`).

## Problem

Cannot test GraphQL subscriptions locally - they require deployed AWS API Gateway WebSocket infrastructure.

## Solution

When `IS_OFFLINE=true`, start a local WebSocket server (using `graphql-ws`) that handles subscriptions. Production continues using AWS API Gateway unchanged.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      IConnectionManager                          │
│  sendToConnection(connectionId, message): Promise<boolean>       │
│  closeConnection(connectionId): Promise<void>                    │
└─────────────────────────────────────────────────────────────────┘
                ▲                              ▲
                │                              │
   ┌────────────┴────────────┐    ┌───────────┴────────────┐
   │ LocalConnectionManager  │    │ APIGatewayConnection   │
   │ (IS_OFFLINE=true)       │    │ Manager (production)   │
   ├─────────────────────────┤    ├────────────────────────┤
   │ - Native WebSocket      │    │ - PostToConnection API │
   │ - In-memory connections │    │ - Valkey for state     │
   │ - Mock JWT validation   │    │ - Existing handlers    │
   └─────────────────────────┘    └────────────────────────┘
```

## Files to Create

```
src/websocket/
├── connection-manager/
│   ├── connection-manager.interface.ts   # IConnectionManager interface
│   ├── connection-manager.provider.ts    # Factory (IS_OFFLINE switch)
│   ├── local-connection-manager.ts       # Local WebSocket server
│   └── index.ts
```

## Implementation

### 1. Interface (`connection-manager.interface.ts`)

```typescript
export interface IConnectionManager {
  sendToConnection(connectionId: string, message: GraphQLWSMessage): Promise<boolean>;
  closeConnection(connectionId: string): Promise<void>;
  getConnectionInfo(connectionId: string): Promise<ConnectionInfo | null>;
  isLocal(): boolean;
}

export const CONNECTION_MANAGER = "CONNECTION_MANAGER";
```

### 2. Local Connection Manager (`local-connection-manager.ts`)

- Starts WebSocket server on port 3001 via `OnModuleInit`
- Handles graphql-ws protocol: `connection_init`, `ping`, `subscribe`, `complete`
- Validates mock JWT tokens from `LocalAuthService`
- Stores connections and subscriptions in memory
- Publishes events directly to connected sockets

### 3. Provider (`connection-manager.provider.ts`)

```typescript
export const connectionManagerProvider = {
  provide: CONNECTION_MANAGER,
  useFactory: (configService, localManager, apiGatewayManager): IConnectionManager => {
    const isOffline = configService.get("app.isOffline", { infer: true });
    return isOffline ? localManager : apiGatewayManager;
  },
  inject: [ConfigService, LocalConnectionManager, APIGatewayConnectionManager],
};
```

### 4. Modify ValkeyPubSub

Update `ValkeyPubSub.publish()` to use `IConnectionManager.sendToConnection()` instead of direct API Gateway client calls. This allows the same publish logic to work in both environments.

## Configuration

Add to `src/config/configuration.ts`:

```typescript
websocket: {
  localPort: parseInt(env.WEBSOCKET_LOCAL_PORT ?? "3001", 10),
}
```

## Docker Compose

**No changes needed.** The existing `docker-compose.yml` already provides Valkey, which the local WebSocket server can optionally use. The local server runs as part of the Node.js process started by `bun start:local`.

## Client Connection

```typescript
// Local: ws://localhost:3001?token={mockToken}
// Production: wss://{apiId}.execute-api.{region}.amazonaws.com/{stage}?token={token}
```

## Dependencies

Already in `package.json`:
- `graphql-ws` (v6.0.6)
- `ws` (peer dependency)

May need to add:
- `uuid` for connection ID generation

## Acceptance Criteria

1. [ ] `bun start:local` starts WebSocket server on port 3001
2. [ ] Client can connect with mock JWT token
3. [ ] GraphQL-WS protocol works (connection_init, ping, subscribe, complete)
4. [ ] Published events reach subscribed clients
5. [ ] Production Lambda handlers unchanged
6. [ ] All existing tests pass
