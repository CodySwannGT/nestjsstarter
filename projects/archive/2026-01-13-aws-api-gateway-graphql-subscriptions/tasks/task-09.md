---
id: task-09
title: Store User Context in Valkey
status: pending
priority: high
phase: 3
---

# Store User Context in Valkey

## Objective

Store authenticated user context alongside connectionId in Valkey for subscription authorization.

## Requirements

1. Update connect handler to store user context from authorizer
2. Create Valkey schema for connection user data
3. Provide method to retrieve user context by connectionId
4. Support subscription authorization by userId, groups

## Implementation Details

Valkey Key Schema:
```
connection:{connectionId} -> {
  userId: string,
  groups: string[],
  connectedAt: number
}
```

```typescript
// In ValkeyService
async setConnectionWithUser(
  connectionId: string,
  userData: { userId: string; groups: string[] }
): Promise<void> {
  await this.client.hset(`connection:${connectionId}`, {
    userId: userData.userId,
    groups: JSON.stringify(userData.groups),
    connectedAt: Date.now().toString(),
  });
}

async getConnectionUser(connectionId: string): Promise<UserContext | null> {
  const data = await this.client.hgetall(`connection:${connectionId}`);
  if (!data.userId) return null;
  return {
    userId: data.userId,
    groups: JSON.parse(data.groups ?? '[]'),
  };
}
```

## Files to Modify

- `/Users/cody/workspace/thumbwar/backend/src/valkey/valkey.service.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/connect.handler.ts`

## Code References

- Auth context pattern: `src/auth/auth.transformer.ts`

## Acceptance Criteria

- [ ] User context stored on $connect
- [ ] Can retrieve user context by connectionId
- [ ] Groups stored as array (JSON serialized)
- [ ] TTL set on connection keys (optional, for cleanup)
- [ ] Unit tests for storage/retrieval

## Dependencies

- task-05 (connect handler)
- task-08 (authorizer provides user context)
