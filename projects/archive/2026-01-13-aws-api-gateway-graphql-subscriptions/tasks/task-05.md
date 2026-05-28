---
id: task-05
title: Create WebSocket Connect Handler
status: pending
priority: high
phase: 2
---

# Create WebSocket Connect Handler

## Objective

Create Lambda handler for WebSocket $connect route that stores connectionId in Valkey.

## Requirements

1. Create `src/websocket/handlers/connect.handler.ts`
2. Extract connectionId from API Gateway event
3. Store connectionId in Valkey with connection metadata
4. Return 200 on success, appropriate error codes on failure
5. Log connection events for debugging

## Implementation Details

```typescript
export const connect: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;

  // Store in Valkey: connections:{connectionId} -> { userId, connectedAt, ... }
  await valkeyService.setConnection(connectionId, {
    userId,
    connectedAt: Date.now(),
  });

  return { statusCode: 200, body: 'Connected' };
};
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/connect.handler.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/index.ts` (barrel export)

## Code References

- Lambda handler pattern: `src/index.ts`
- AWS Lambda types: `@types/aws-lambda`

## Acceptance Criteria

- [ ] Handler extracts connectionId from event
- [ ] ConnectionId stored in Valkey with metadata
- [ ] Returns 200 on successful connection
- [ ] Handles errors gracefully with appropriate status codes
- [ ] JSDoc documentation on handler

## Dependencies

- task-03 (requires ValkeyService)
- task-04 (requires serverless.yml configuration)
