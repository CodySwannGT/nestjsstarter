---
id: task-06
title: Create WebSocket Disconnect Handler
status: pending
priority: high
phase: 2
---

# Create WebSocket Disconnect Handler

## Objective

Create Lambda handler for WebSocket $disconnect route that removes connectionId from Valkey.

## Requirements

1. Create `src/websocket/handlers/disconnect.handler.ts`
2. Extract connectionId from API Gateway event
3. Remove connectionId and all associated subscriptions from Valkey
4. Return 200 on success
5. Handle gracefully if connection already removed

## Implementation Details

```typescript
export const disconnect: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  // Remove from Valkey: connections:{connectionId}
  // Also remove all subscriptions for this connection
  await valkeyService.removeConnection(connectionId);

  return { statusCode: 200, body: 'Disconnected' };
};
```

## Files to Create/Modify

- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/disconnect.handler.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/index.ts` (update barrel)

## Code References

- Connect handler pattern: task-05

## Acceptance Criteria

- [ ] Handler extracts connectionId from event
- [ ] ConnectionId removed from Valkey
- [ ] Associated subscriptions cleaned up
- [ ] Returns 200 even if connection not found (idempotent)
- [ ] JSDoc documentation on handler

## Dependencies

- task-03 (requires ValkeyService)
- task-05 (follows same pattern)
