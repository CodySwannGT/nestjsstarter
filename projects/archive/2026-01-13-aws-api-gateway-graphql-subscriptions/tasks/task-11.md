---
id: task-11
title: Create Valkey PubSub Adapter
status: pending
priority: high
phase: 4
---

# Create Valkey PubSub Adapter

## Objective

Create custom PubSub implementation using Valkey pub/sub for event distribution across Lambda invocations.

## Requirements

1. Create `src/subscription/pubsub/valkey-pubsub.ts`
2. Implement PubSubEngine interface from graphql-subscriptions
3. Use Valkey pub/sub for cross-Lambda event distribution
4. Bridge pub/sub events to API Gateway Management API for client delivery

## Implementation Details

```typescript
import { PubSubEngine } from 'graphql-subscriptions';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

export class ValkeyPubSub implements PubSubEngine {
  private subscriptionId = 0;

  async publish(triggerName: string, payload: unknown): Promise<void> {
    // 1. Publish to Valkey channel
    await this.valkeyService.publish(triggerName, JSON.stringify(payload));

    // 2. Query subscriptions matching this trigger
    const subscribers = await this.valkeyService.getSubscribers(triggerName);

    // 3. Send to each subscriber via API Gateway Management API
    await Promise.all(
      subscribers.map(sub => this.sendToConnection(sub.connectionId, payload))
    );
  }

  async subscribe(
    triggerName: string,
    onMessage: (payload: unknown) => void
  ): Promise<number> {
    // For serverless, subscriptions are stored in Valkey
    // The actual delivery happens via publish() above
    return ++this.subscriptionId;
  }

  unsubscribe(subId: number): void {
    // Remove subscription from Valkey
  }
}
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/subscription/pubsub/valkey-pubsub.ts`
- `/Users/cody/workspace/thumbwar/backend/src/subscription/pubsub/index.ts`

## Code References

- research.md: Message Broadcasting section
- graphql-subscriptions: PubSubEngine interface

## Acceptance Criteria

- [ ] Implements PubSubEngine interface
- [ ] publish() sends to all matching subscribers
- [ ] Uses API Gateway Management API for WebSocket delivery
- [ ] Handles stale connections gracefully (410 Gone)
- [ ] JSDoc documentation on all methods

## Dependencies

- task-02 (AWS SDK)
- task-03 (ValkeyService)
- task-10 (graphql-subscriptions)
