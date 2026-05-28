---
id: task-18
title: Add Unit Tests for WebSocket Handlers
status: pending
priority: high
phase: 7
---

# Add Unit Tests for WebSocket Handlers

## Objective

Create unit tests for connect, disconnect, and default WebSocket handlers.

## Requirements

1. Create `src/websocket/handlers/connect.handler.test.ts`
2. Create `src/websocket/handlers/disconnect.handler.test.ts`
3. Create `src/websocket/handlers/default.handler.test.ts`
4. Mock ValkeyService and API Gateway context
5. Test all protocol message types

## Implementation Details

```typescript
/**
 * @file connect.handler.test.ts
 * @description Unit tests for WebSocket connect handler
 * @module websocket
 */

describe('connect handler', () => {
  it('should store connectionId in Valkey', async () => {
    const event = createMockEvent({ connectionId: 'test-123' });
    const result = await connect(event);
    expect(result.statusCode).toBe(200);
    expect(mockValkeyService.setConnection).toHaveBeenCalledWith('test-123', expect.any(Object));
  });
});
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/connect.handler.test.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/disconnect.handler.test.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/handlers/default.handler.test.ts`

## Code References

- Test patterns: `src/hello/hello.resolver.test.ts`
- Handlers: tasks 05, 06, 07

## Acceptance Criteria

- [ ] All three handlers have test files
- [ ] Connect handler tests storage
- [ ] Disconnect handler tests cleanup
- [ ] Default handler tests all message types
- [ ] Error scenarios covered
- [ ] All tests pass

## Dependencies

- task-05, task-06, task-07 (handler implementations)
