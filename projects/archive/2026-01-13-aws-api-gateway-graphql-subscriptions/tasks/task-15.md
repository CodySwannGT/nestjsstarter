---
id: task-15
title: Integrate Subscriptions with GraphQL Module
status: pending
priority: high
phase: 5
---

# Integrate Subscriptions with GraphQL Module

## Objective

Update AppModule to configure GraphQL subscription support with the custom Valkey-based infrastructure.

## Requirements

1. Import SubscriptionModule in AppModule
2. Configure GraphQL module for subscription support
3. Update schema transformer to enforce auth on subscriptions
4. Ensure zero-trust applies to subscriptions

## Implementation Details

```typescript
// app.module.ts updates
@Module({
  imports: [
    SubscriptionModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataLoaderModule, SubscriptionModule],
      inject: [DataLoaderService],
      useFactory: (dataLoaderService: DataLoaderService) => ({
        autoSchemaFile: true,
        playground: false,
        introspection: true,
        transformSchema: combinedAuthTransformer,
        context: ({ req, connection }) => ({
          // Support both HTTP requests and WebSocket connections
          ...(connection?.context ?? {}),
          loaders: dataLoaderService.getLoaders(),
        }),
        subscriptions: {
          'graphql-ws': true,
        },
      }),
    }),
    // ...
  ],
})
export class AppModule {}
```

## Files to Modify

- `/Users/cody/workspace/thumbwar/backend/src/app.module.ts`
- `/Users/cody/workspace/thumbwar/backend/src/auth/auth.transformer.ts` (if needed for subscription auth)

## Code References

- Current config: `src/app.module.ts:23-52`
- Auth transformer: `src/auth/auth.transformer.ts`

## Acceptance Criteria

- [ ] SubscriptionModule imported in AppModule
- [ ] GraphQL module configured for subscriptions
- [ ] Auth transformer enforces auth on subscription operations
- [ ] Context factory supports WebSocket connections
- [ ] `bun run build` succeeds

## Dependencies

- task-12 (SubscriptionModule)
- task-13 (SubscriptionAuth decorator)
