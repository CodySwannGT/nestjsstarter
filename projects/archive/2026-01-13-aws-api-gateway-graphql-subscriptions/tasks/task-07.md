---
id: task-07
title: Create WebSocket Default Handler
status: pending
priority: high
phase: 2
---

# Create WebSocket Default Handler

## Objective

Create Lambda handler for WebSocket $default route that processes GraphQL-WS protocol messages.

## Requirements

1. Create `src/websocket/handlers/default.handler.ts`
2. Parse GraphQL-WS protocol messages (connection_init, subscribe, complete, ping, pong)
3. Handle subscription registration/unregistration
4. Store subscription queries in Valkey for later broadcast matching
5. Acknowledge protocol messages appropriately

## Implementation Details

GraphQL-WS Protocol Messages:
- `connection_init` → Respond with `connection_ack`
- `ping` → Respond with `pong`
- `subscribe` → Register subscription in Valkey, respond with acknowledgment
- `complete` → Unregister subscription from Valkey

```typescript
export const defaultHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body ?? '{}');

  switch (message.type) {
    case 'connection_init':
      return sendMessage(connectionId, { type: 'connection_ack' });
    case 'subscribe':
      await registerSubscription(connectionId, message.id, message.payload);
      return { statusCode: 200, body: '' };
    case 'complete':
      await unregisterSubscription(connectionId, message.id);
      return { statusCode: 200, body: '' };
    // ...
  }
};
```

## Files to Create/Modify

- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/default.handler.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/index.ts` (update barrel)

## Code References

- GraphQL-WS protocol: https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
- research.md: Subscription event flow section

## Acceptance Criteria

- [ ] Handles connection_init with connection_ack response
- [ ] Handles ping with pong response
- [ ] Handles subscribe by storing subscription in Valkey
- [ ] Handles complete by removing subscription from Valkey
- [ ] Parses subscription query for filter criteria
- [ ] Returns appropriate status codes
- [ ] JSDoc documentation on handler

## Dependencies

- task-03 (requires ValkeyService)
- task-05, task-06 (follows same pattern)
