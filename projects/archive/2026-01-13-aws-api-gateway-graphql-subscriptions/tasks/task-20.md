---
id: task-20
title: Add Integration Tests for WebSocket Subscriptions
status: pending
priority: medium
phase: 7
---

# Add Integration Tests for WebSocket Subscriptions

## Objective

Create integration tests for end-to-end subscription flow.

## Requirements

1. Create `src/subscription/subscription.integration.test.ts`
2. Test full subscription lifecycle with local Valkey
3. Test mutation → subscription event flow
4. Test authorization filtering
5. Requires docker-compose Valkey running

## Implementation Details

```typescript
/**
 * @file subscription.integration.test.ts
 * @description Integration tests for GraphQL subscriptions
 * @module subscription
 */

describe('Subscription Integration', () => {
  beforeAll(async () => {
    // Start test app with real Valkey connection
    // Requires docker-compose up -d
  });

  describe('subscription lifecycle', () => {
    it('should receive event when mutation publishes', async () => {
      // 1. Register subscription
      // 2. Execute mutation
      // 3. Verify subscription received event
    });

    it('should filter events by owner', async () => {
      // Test owner-based filtering
    });
  });
});
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/subscription/subscription.integration.test.ts`

## Code References

- Integration test pattern: project conventions in research.md
- Full stack: all previous tasks

## Acceptance Criteria

- [ ] Integration test file created
- [ ] Tests full subscription flow
- [ ] Tests authorization filtering
- [ ] Tests pass with Valkey running
- [ ] Clear documentation on test requirements

## Dependencies

- task-01 (docker-compose for Valkey)
- All other tasks (full implementation required)
