---
id: task-14
title: Create Base Subscription Resolver
status: pending
priority: high
phase: 5
---

# Create Base Subscription Resolver

## Objective

Create abstract base class with onCreate/onUpdate/onDelete subscription patterns for easy implementation.

## Requirements

1. Create `src/subscription/base-subscription.resolver.ts`
2. Provide generic methods for CRUD subscriptions
3. Generate consistent trigger names
4. Handle subscription filtering logic

## Implementation Details

```typescript
export abstract class BaseSubscriptionResolver<T> {
  constructor(
    @Inject('PUB_SUB') protected readonly pubSub: ValkeyPubSub,
    protected readonly entityName: string
  ) {}

  protected getTriggerName(
    action: 'created' | 'updated' | 'deleted',
    filter?: { resourceId?: string; ownerId?: string }
  ): string {
    const base = `${this.entityName}.${action}`;
    if (filter?.resourceId) return `${base}.${filter.resourceId}`;
    if (filter?.ownerId) return `${base}.owner.${filter.ownerId}`;
    return base;
  }

  // Call this from mutation resolvers after successful mutation
  async publishCreated(entity: T, ownerId?: string): Promise<void> {
    await this.pubSub.publish(
      this.getTriggerName('created'),
      { [`${this.entityName}Created`]: entity }
    );
    if (ownerId) {
      await this.pubSub.publish(
        this.getTriggerName('created', { ownerId }),
        { [`${this.entityName}Created`]: entity }
      );
    }
  }

  // Similar for publishUpdated, publishDeleted
}
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/subscription/base-subscription.resolver.ts`

## Code References

- Resolver pattern: `src/hello/hello.resolver.ts`
- research.md: Subscription Event Flow

## Acceptance Criteria

- [ ] Abstract base class with CRUD subscription methods
- [ ] Consistent trigger name generation
- [ ] Filter support (resourceId, ownerId, orgId)
- [ ] Methods for publishing from mutation resolvers
- [ ] JSDoc documentation with usage examples

## Dependencies

- task-11 (ValkeyPubSub)
- task-12 (SubscriptionModule)
