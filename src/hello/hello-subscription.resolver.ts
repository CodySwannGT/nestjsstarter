/**
 * @file hello-subscription.resolver.ts
 * @description Example subscription resolver demonstrating auto-subscription patterns
 * @module hello
 */

import { Inject } from "@nestjs/common";
import { Resolver, Subscription, Args } from "@nestjs/graphql";
import {
  BaseSubscriptionResolver,
  PUB_SUB,
  ValkeyPubSub,
} from "../subscription";
import {
  AuthedSubscription,
  PublicSubscription,
} from "../auth/decorators/subscription-auth.decorator";

/**
 * Example subscription resolver for Hello entity
 * @description Demonstrates the auto-subscription pattern with onCreate, onUpdate, onDelete
 * @remarks
 * - Extends BaseSubscriptionResolver for common subscription patterns
 * - Shows how to use SubscriptionAuth decorators
 * - Demonstrates filtered subscriptions by owner
 * - Uses string payloads for simplicity (real implementations would use typed objects)
 */
@Resolver()
export class HelloSubscriptionResolver extends BaseSubscriptionResolver<string> {
  /**
   * Creates a HelloSubscriptionResolver instance
   * @param pubSub - PubSub service for subscription events
   */
  constructor(@Inject(PUB_SUB) pubSub: ValkeyPubSub) {
    super(pubSub, "Hello");
  }

  /**
   * Subscription for new hello greetings
   * @description Triggered when a new greeting is created
   * @returns Async iterator for the subscription
   * @example
   * ```graphql
   * subscription {
   *   onHelloCreated
   * }
   * ```
   */
  @Subscription(() => String, {
    description: "Triggered when a new hello greeting is created",
    nullable: true,
  })
  @PublicSubscription()
  onHelloCreated(): AsyncIterator<string> {
    return this.pubSub.asyncIterator<string>(this.getCreatedTrigger());
  }

  /**
   * Subscription for updated hello greetings with owner filter
   * @param _ownerId - Filter events to this owner's greetings (unused, for signature)
   * @description Triggered when a greeting is updated, filtered by owner
   * @returns Async iterator for the subscription
   * @example
   * ```graphql
   * subscription {
   *   onHelloUpdated(ownerId: "user-123")
   * }
   * ```
   */
  @Subscription(() => String, {
    description: "Triggered when a hello greeting is updated",
    nullable: true,
  })
  @AuthedSubscription({ owner: true })
  onHelloUpdated(
    @Args("ownerId", { nullable: true }) _ownerId?: string
  ): AsyncIterator<string> {
    return this.pubSub.asyncIterator<string>(this.getUpdatedTrigger());
  }

  /**
   * Subscription for deleted hello greetings
   * @description Triggered when a greeting is deleted
   * @returns Async iterator for the subscription
   */
  @Subscription(() => String, {
    description: "Triggered when a hello greeting is deleted",
    nullable: true,
  })
  @AuthedSubscription()
  onHelloDeleted(): AsyncIterator<string> {
    return this.pubSub.asyncIterator<string>(this.getDeletedTrigger());
  }
}
