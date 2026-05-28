---
id: task-19
title: Add Unit Tests for Valkey PubSub Adapter
status: pending
priority: high
phase: 7
---

# Add Unit Tests for Valkey PubSub Adapter

## Objective

Create unit tests for ValkeyPubSub implementation.

## Requirements

1. Create `src/subscription/pubsub/valkey-pubsub.test.ts`
2. Test publish broadcasts to all subscribers
3. Test subscribe/unsubscribe lifecycle
4. Test stale connection handling (410 errors)
5. Mock Valkey and API Gateway Management API

## Implementation Details

```typescript
/**
 * @file valkey-pubsub.test.ts
 * @description Unit tests for ValkeyPubSub adapter
 * @module subscription
 */

describe('ValkeyPubSub', () => {
  describe('publish', () => {
    it('should send to all matching subscribers', async () => {
      // Setup mock subscribers
      // Call publish
      // Verify PostToConnection called for each
    });

    it('should handle 410 Gone by removing stale connection', async () => {
      // Setup subscriber that returns 410
      // Call publish
      // Verify connection removed from Valkey
    });
  });

  describe('subscribe', () => {
    it('should register subscription in Valkey', async () => {
      // Test subscription storage
    });
  });
});
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/subscription/pubsub/valkey-pubsub.test.ts`

## Code References

- ValkeyPubSub: task-11
- Test patterns: `src/hello/hello.service.test.ts`

## Acceptance Criteria

- [ ] publish() tested for broadcast delivery
- [ ] subscribe() tested for registration
- [ ] unsubscribe() tested for cleanup
- [ ] 410 error handling tested
- [ ] All tests pass

## Dependencies

- task-11 (ValkeyPubSub implementation)
