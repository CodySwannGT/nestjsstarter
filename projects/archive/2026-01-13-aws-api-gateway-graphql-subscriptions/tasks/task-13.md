---
id: task-13
title: Add Subscription Auth Decorator
status: pending
priority: high
phase: 5
---

# Add Subscription Auth Decorator

## Objective

Create @SubscriptionAuth() decorator for authorizing GraphQL subscriptions with filtering support.

## Requirements

1. Create `src/auth/decorators/subscription-auth.decorator.ts`
2. Support same auth levels as query/mutation (@Public, @Authed, @Groups, @Owner)
3. Support filtering by resourceId, owner, organization
4. Integrate with zero-trust auth enforcement

## Implementation Details

```typescript
export interface SubscriptionAuthOptions {
  auth: 'public' | 'authed' | 'groups' | 'owner';
  groups?: string[];
  filter?: {
    resourceId?: boolean;  // Filter by specific resource ID
    owner?: boolean;       // Filter to only owner's resources
    organization?: boolean; // Filter by organization
  };
}

export const SubscriptionAuth = (options: SubscriptionAuthOptions) =>
  applyDecorators(
    SetMetadata(SUBSCRIPTION_AUTH_KEY, options),
    // Apply corresponding auth decorator
    options.auth === 'public' ? Public() :
    options.auth === 'authed' ? Authed() :
    options.auth === 'groups' ? Groups(...(options.groups ?? [])) :
    Owner()
  );
```

Usage:
```typescript
@Subscription(() => Post)
@SubscriptionAuth({ auth: 'authed', filter: { owner: true } })
onPostCreated(@Args('ownerId') ownerId: string) {
  return this.pubSub.asyncIterator(`post.created.${ownerId}`);
}
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/auth/decorators/subscription-auth.decorator.ts`

## Code References

- Auth decorators: `src/auth/decorators/`
- Owner decorator: `src/auth/decorators/auth-owner.decorator.ts`

## Acceptance Criteria

- [ ] Decorator supports public, authed, groups, owner auth levels
- [ ] Filter options work for resourceId, owner, organization
- [ ] Integrates with existing zero-trust enforcement
- [ ] JSDoc documentation with examples

## Dependencies

- task-12 (SubscriptionModule provides context)
