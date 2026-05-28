---
id: task-12
title: Create Subscription Module
status: pending
priority: high
phase: 4
---

# Create Subscription Module

## Objective

Create NestJS module encapsulating all subscription infrastructure.

## Requirements

1. Create `src/subscription/subscription.module.ts`
2. Export ValkeyPubSub as injectable provider
3. Configure as global module for access across features
4. Provide factory for creating subscription-specific PubSub instances

## Implementation Details

```typescript
@Global()
@Module({
  imports: [ValkeyModule],
  providers: [
    {
      provide: 'PUB_SUB',
      useFactory: (valkeyService: ValkeyService) => {
        return new ValkeyPubSub(valkeyService);
      },
      inject: [ValkeyService],
    },
  ],
  exports: ['PUB_SUB'],
})
export class SubscriptionModule {}
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/subscription/subscription.module.ts`
- `/Users/cody/workspace/thumbwar/backend/src/subscription/index.ts`

## Code References

- Module pattern: `src/hello/hello.module.ts`
- Global module: `src/data-loader/data-loader.module.ts`

## Acceptance Criteria

- [ ] SubscriptionModule created and exports PUB_SUB
- [ ] Can inject PUB_SUB in any resolver
- [ ] Module is global (no need to import in each feature)
- [ ] JSDoc documentation on module

## Dependencies

- task-03 (ValkeyModule)
- task-11 (ValkeyPubSub)
