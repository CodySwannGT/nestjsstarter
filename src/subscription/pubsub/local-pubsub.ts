/**
 * @file local-pubsub.ts
 * @description Local PubSub implementation using in-memory graphql-subscriptions
 * @module subscription/pubsub
 */

import { Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { SubscriptionFilters } from "../../valkey/valkey.interface";

/**
 * In-memory PubSub implementation for local development
 * @description Provides the same interface as ValkeyPubSub but uses graphql-subscriptions
 * for in-memory subscription delivery. This enables GraphQL subscriptions to work
 * in local development without requiring API Gateway WebSocket infrastructure.
 * @remarks
 * - Extends PubSub from graphql-subscriptions for working asyncIterator support
 * - Implements publishCreated, publishUpdated, publishDeleted for ValkeyPubSub parity
 * - Filters parameter is unused in local mode (included for interface compatibility)
 * - Used when IS_OFFLINE=true to enable local subscription testing
 */
@Injectable()
export class LocalPubSub extends PubSub {
  /**
   * Publishes an event for a resource
   * @param eventType - The event type (e.g., "Created", "Updated", "Deleted")
   * @param resourceType - The resource type (e.g., "User", "Post")
   * @param data - The resource data to publish
   * @returns Promise that resolves when the event is published
   * @remarks
   * Constructs trigger name as on{ResourceType}{EventType}
   * and payload key as {resourceType}{eventType}
   */
  private async publishEvent<T>(
    eventType: string,
    resourceType: string,
    data: T
  ): Promise<void> {
    const triggerName = `on${resourceType}${eventType}`;
    const payloadKey = `${resourceType.toLowerCase()}${eventType}`;
    await this.publish(triggerName, { [payloadKey]: data });
  }

  /**
   * Publishes a "created" event for a resource
   * @param resourceType - The resource type (e.g., "User", "Post")
   * @param data - The created resource data
   * @param _filters - Unused in local mode (included for ValkeyPubSub interface parity)
   * @returns Promise that resolves when the event is published
   * @remarks Uses trigger name format: on{ResourceType}Created
   */
  async publishCreated<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    await this.publishEvent("Created", resourceType, data);
  }

  /**
   * Publishes an "updated" event for a resource
   * @param resourceType - The resource type (e.g., "User", "Post")
   * @param data - The updated resource data
   * @param _filters - Unused in local mode (included for ValkeyPubSub interface parity)
   * @returns Promise that resolves when the event is published
   * @remarks Uses trigger name format: on{ResourceType}Updated
   */
  async publishUpdated<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    await this.publishEvent("Updated", resourceType, data);
  }

  /**
   * Publishes a "deleted" event for a resource
   * @param resourceType - The resource type (e.g., "User", "Post")
   * @param data - The deleted resource data
   * @param _filters - Unused in local mode (included for ValkeyPubSub interface parity)
   * @returns Promise that resolves when the event is published
   * @remarks Uses trigger name format: on{ResourceType}Deleted
   */
  async publishDeleted<T>(
    resourceType: string,
    data: T,
    _filters?: SubscriptionFilters
  ): Promise<void> {
    await this.publishEvent("Deleted", resourceType, data);
  }

  /**
   * Creates an async iterator for subscription delivery
   * @param triggerName - The subscription trigger name (e.g., "onUserCreated")
   * @returns AsyncIterator for receiving subscription events
   * @remarks Wraps parent class asyncIterableIterator for ValkeyPubSub interface parity
   */
  asyncIterator<T>(triggerName: string): AsyncIterator<T> {
    return this.asyncIterableIterator<T>(triggerName);
  }
}
