---
id: task-03
title: Create Valkey Connection Service
status: pending
priority: high
phase: 1
---

# Create Valkey Connection Service

## Objective

Create NestJS service for Valkey client with connection management.

## Requirements

1. Create `src/valkey/valkey.module.ts` - NestJS module
2. Create `src/valkey/valkey.service.ts` - Connection service
3. Create `src/valkey/valkey.interface.ts` - TypeScript interfaces
4. Configure via environment variables (VALKEY_HOST, VALKEY_PORT)
5. Handle connection errors gracefully
6. Support both local (Docker) and AWS ElastiCache endpoints

## Implementation Details

```typescript
// valkey.service.ts pattern
@Injectable()
export class ValkeyService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.VALKEY_HOST ?? 'localhost',
      port: parseInt(process.env.VALKEY_PORT ?? '6379', 10),
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/valkey/valkey.module.ts`
- `/Users/cody/workspace/thumbwar/backend/src/valkey/valkey.service.ts`
- `/Users/cody/workspace/thumbwar/backend/src/valkey/valkey.interface.ts`

## Code References

- Pattern to follow: `src/data-loader/data-loader.service.ts`
- Module pattern: `src/hello/hello.module.ts`

## Acceptance Criteria

- [ ] ValkeyModule exports ValkeyService
- [ ] ValkeyService connects on module init
- [ ] ValkeyService disconnects on module destroy
- [ ] Environment variables configure host/port
- [ ] Connection errors are logged appropriately
- [ ] JSDoc documentation on all exports

## Dependencies

- task-02 (requires ioredis package)
