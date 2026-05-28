/**
 * @file base-subscription.resolver.ts
 * @description Abstract base class for subscription resolvers with CRUD patterns
 * @module subscription
 */

import { Inject } from "@nestjs/common";
import { ValkeyPubSub } from "./pubsub/valkey-pubsub";
import { PUB_SUB } from "./subscription.module";
import { SubscriptionFilters } from "../valkey/valkey.interface";

/**
 * Abstract base class for subscription resolvers
 * @description Provides common subscription patterns (onCreate, onUpdate, onDelete)
 * @remarks
 * - Extend this class in feature resolvers to add subscription support
 * - Provides standardized trigger name generation
 * - Integrates with ValkeyPubSub for serverless delivery
 * @example
 * ```typescript
 * \@Resolver(() => Post)
 * export class PostSubscriptionResolver extends BaseSubscriptionResolver<Post> {
 *   constructor(\@Inject(PUB_SUB) pubSub: ValkeyPubSub) {
 *     super(pubSub, 'Post');
 *   }
 *
 *   \@Subscription(() => Post)
 *   \@AuthedSubscription({ owner: true })
 *   onPostCreated() {
 *     return this.pubSub.asyncIterator(this.getCreatedTrigger());
 *   }
 * }
 * ```
 */
export abstract class BaseSubscriptionResolver<T> {
  /**
   * Creates a BaseSubscriptionResolver instance
   * @param pubSub - PubSub service for subscription events
   * @param entityName - Name of the entity for trigger naming
   */
  constructor(
    @Inject(PUB_SUB) protected readonly pubSub: ValkeyPubSub,
    protected readonly entityName: string
  ) {}

  /**
   * Gets the trigger name for "created" events
   * @returns Trigger name string
   */
  protected getCreatedTrigger(): string {
    return `on${this.entityName}Created`;
  }

  /**
   * Gets the trigger name for "updated" events
   * @returns Trigger name string
   */
  protected getUpdatedTrigger(): string {
    return `on${this.entityName}Updated`;
  }

  /**
   * Gets the trigger name for "deleted" events
   * @returns Trigger name string
   */
  protected getDeletedTrigger(): string {
    return `on${this.entityName}Deleted`;
  }

  /**
   * Publishes a "created" event for an entity
   * @param entity - The created entity
   * @param filters - Optional filters for targeted delivery
   * @remarks Call this from mutation resolvers after creating an entity
   */
  async publishCreated(
    entity: T,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    await this.pubSub.publishCreated(
      this.entityName,
      entity as Record<string, unknown>,
      filters
    );
  }

  /**
   * Publishes an "updated" event for an entity
   * @param entity - The updated entity
   * @param filters - Optional filters for targeted delivery
   * @remarks Call this from mutation resolvers after updating an entity
   */
  async publishUpdated(
    entity: T,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    await this.pubSub.publishUpdated(
      this.entityName,
      entity as Record<string, unknown>,
      filters
    );
  }

  /**
   * Publishes a "deleted" event for an entity
   * @param entity - The deleted entity (or identifier)
   * @param filters - Optional filters for targeted delivery
   * @remarks Call this from mutation resolvers after deleting an entity
   */
  async publishDeleted(
    entity: T,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    await this.pubSub.publishDeleted(
      this.entityName,
      entity as Record<string, unknown>,
      filters
    );
  }
}
