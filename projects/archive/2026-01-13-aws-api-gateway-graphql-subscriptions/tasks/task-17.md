---
id: task-17
title: Add Unit Tests for Valkey Connection Service
status: pending
priority: high
phase: 7
---

# Add Unit Tests for Valkey Connection Service

## Objective

Create comprehensive unit tests for ValkeyService connection management.

## Requirements

1. Create `src/valkey/valkey.service.test.ts`
2. Test connection lifecycle (init, destroy)
3. Test CRUD operations for connections
4. Test error handling scenarios
5. Mock ioredis client

## Implementation Details

```typescript
/**
 * @file valkey.service.test.ts
 * @description Unit tests for ValkeyService
 * @module valkey
 */

describe('ValkeyService', () => {
  describe('onModuleInit', () => {
    it('should connect to Valkey on init', async () => {
      // Test connection establishment
    });

    it('should use environment variables for config', async () => {
      // Test VALKEY_HOST, VALKEY_PORT
    });
  });

  describe('setConnection', () => {
    it('should store connection with metadata', async () => {
      // Test connection storage
    });
  });

  describe('removeConnection', () => {
    it('should remove connection and subscriptions', async () => {
      // Test cleanup
    });
  });
});
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/valkey/valkey.service.test.ts`

## Code References

- Test patterns: `src/hello/hello.service.test.ts`
- ValkeyService: task-03

## Acceptance Criteria

- [ ] Tests cover connection lifecycle
- [ ] Tests cover all public methods
- [ ] ioredis properly mocked
- [ ] Error scenarios tested
- [ ] All tests pass with `bun run test`

## Dependencies

- task-03 (ValkeyService implementation)
