---
id: task-02
title: Add AWS SDK and Valkey Dependencies
status: pending
priority: high
phase: 1
---

# Add AWS SDK and Valkey Dependencies

## Objective

Install required npm packages for AWS API Gateway Management API and Valkey client.

## Requirements

1. Add `@aws-sdk/client-apigatewaymanagementapi` for WebSocket message broadcasting
2. Add `ioredis` for Valkey/Redis client (fully compatible with Valkey)
3. Add `@types/ioredis` as dev dependency if needed

## Implementation Details

```bash
bun add @aws-sdk/client-apigatewaymanagementapi ioredis
```

## Files to Modify

- `/Users/cody/workspace/thumbwar/backend/package.json` (update dependencies)

## Acceptance Criteria

- [ ] `@aws-sdk/client-apigatewaymanagementapi` installed
- [ ] `ioredis` installed
- [ ] `bun install` completes without errors
- [ ] TypeScript can import both packages without errors

## Dependencies

None - can run in parallel with task-01.
