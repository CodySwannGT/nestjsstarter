---
id: task-16
title: Create Example Subscription Resolver
status: pending
priority: medium
phase: 6
---

# Create Example Subscription Resolver

## Objective

Create demonstration implementation showing auto-subscription pattern with existing Hello entity.

## Requirements

1. Create `src/hello/hello-subscription.resolver.ts`
2. Add onHelloCreated, onHelloUpdated, onHelloDeleted subscriptions
3. Update HelloResolver mutations to publish events
4. Demonstrate filtering by different criteria

## Implementation Details

```typescript
@Resolver()
export class HelloSubscriptionResolver extends BaseSubscriptionResolver<string> {
  constructor(@Inject('PUB_SUB') pubSub: ValkeyPubSub) {
    super(pubSub, 'hello');
  }

  @Subscription(() => String, { description: 'Triggered when hello is called' })
  @SubscriptionAuth({ auth: 'authed' })
  onHelloCreated() {
    return this.pubSub.asyncIterator(this.getTriggerName('created'));
  }
}

// In HelloResolver
@Mutation(() => String)
@Authed()
async greet(
  @Args('name') name: string,
  @Inject('PUB_SUB') pubSub: ValkeyPubSub
): Promise<string> {
  const result = `Hello, ${name}!`;
  await pubSub.publish('hello.created', { helloCreated: result });
  return result;
}
```

## Files to Create/Modify

- `/Users/cody/workspace/thumbwar/backend/src/hello/hello-subscription.resolver.ts` (create)
- `/Users/cody/workspace/thumbwar/backend/src/hello/hello.resolver.ts` (modify)
- `/Users/cody/workspace/thumbwar/backend/src/hello/hello.module.ts` (add provider)

## Code References

- Hello resolver: `src/hello/hello.resolver.ts`
- Base subscription: task-14

## Acceptance Criteria

- [ ] HelloSubscriptionResolver extends BaseSubscriptionResolver
- [ ] Subscriptions have proper auth decorators
- [ ] Mutations publish to subscription triggers
- [ ] GraphQL schema includes subscription operations
- [ ] Example demonstrates filtering pattern
- [ ] JSDoc documentation

## Dependencies

- task-14 (BaseSubscriptionResolver)
- task-15 (GraphQL subscription integration)
