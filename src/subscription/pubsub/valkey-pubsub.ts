/**
 * @file valkey-pubsub.ts
 * @description Custom PubSub implementation for serverless GraphQL subscriptions
 * @module subscription/pubsub
 */

import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { configuration } from "../../config/configuration";
import { SubscriptionFilters } from "../../valkey/valkey.interface";
import { ValkeyService } from "../../valkey/valkey.service";

/**
 * PubSub message for GraphQL-WS protocol
 */
interface GraphQLWSNextMessage {
  id: string;
  type: "next";
  payload: {
    data: Record<string, unknown>;
  };
}

/**
 * Configuration for ValkeyPubSub
 */
export interface ValkeyPubSubConfig {
  /** WebSocket API Gateway endpoint URL */
  apiGatewayEndpoint?: string;
}

/**
 * Custom PubSub adapter for serverless GraphQL subscriptions
 * @description Bridges NestJS/Apollo subscriptions to Valkey and API Gateway
 * @remarks
 * - Stores subscriptions in Valkey for persistence across Lambda invocations
 * - Broadcasts events via API Gateway Management API
 * - Handles stale connections gracefully
 * - Designed specifically for serverless environments where standard
 *   graphql-subscriptions PubSubEngine patterns don't apply
 * - Uses configuration() for configuration when not passed via constructor
 */
export class ValkeyPubSub {
  private apiGatewayClient: ApiGatewayManagementApiClient | null = null;

  /**
   * Creates a ValkeyPubSub instance
   * @param valkeyService - Valkey service for subscription storage
   * @param config - Optional configuration for API Gateway endpoint
   */
  constructor(
    private readonly valkeyService: ValkeyService,
    private readonly config: ValkeyPubSubConfig = {}
  ) {}

  /**
   * Publishes an event to all matching subscribers
   * @param operationName - The subscription operation name (e.g., "postCreated")
   * @param payload - The data to send to subscribers
   * @param filters - Optional filters for targeted delivery
   * @remarks
   * - Queries Valkey for matching subscriptions
   * - Sends GraphQL-WS "next" messages via API Gateway
   * - Removes stale connections on 410 Gone errors
   */
  async publish(
    operationName: string,
    payload: Record<string, unknown>,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    const subscribers = await this.valkeyService.getSubscribers(
      operationName,
      filters
    );
    console.log(`Publishing to ${subscribers.length} subscribers:`, {
      operationName,
      filters,
    });
    await Promise.all(
      subscribers.map(subscriber => this.sendToSubscriber(subscriber, payload))
    );
  }

  /**
   * Sends the event payload to a single subscriber, swallowing errors so
   * one bad connection does not block the remaining deliveries
   * @param subscriber - Subscription record with connection and subscription IDs
   * @param subscriber.connectionId - API Gateway connection ID for the subscriber
   * @param subscriber.subscriptionId - GraphQL-WS subscription ID for the message envelope
   * @param payload - The data to include in the GraphQL-WS "next" message
   */
  private async sendToSubscriber(
    subscriber: { connectionId: string; subscriptionId: string },
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.sendToConnection(subscriber.connectionId, {
        id: subscriber.subscriptionId,
        type: "next",
        payload: { data: payload },
      });
    } catch (error) {
      console.error(
        `Failed to send to connection ${subscriber.connectionId}:`,
        error
      );
    }
  }

  /**
   * Publishes a "created" event for a resource
   * @param resourceType - The resource type (e.g., "Post", "Comment")
   * @param data - The created resource data
   * @param filters - Optional filters for targeted delivery
   */
  async publishCreated(
    resourceType: string,
    data: Record<string, unknown>,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    const operationName = `on${resourceType}Created`;
    await this.publish(
      operationName,
      { [`${resourceType.toLowerCase()}Created`]: data },
      filters
    );
  }

  /**
   * Publishes an "updated" event for a resource
   * @param resourceType - The resource type (e.g., "Post", "Comment")
   * @param data - The updated resource data
   * @param filters - Optional filters for targeted delivery
   */
  async publishUpdated(
    resourceType: string,
    data: Record<string, unknown>,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    const operationName = `on${resourceType}Updated`;
    await this.publish(
      operationName,
      { [`${resourceType.toLowerCase()}Updated`]: data },
      filters
    );
  }

  /**
   * Publishes a "deleted" event for a resource
   * @param resourceType - The resource type (e.g., "Post", "Comment")
   * @param data - The deleted resource data
   * @param filters - Optional filters for targeted delivery
   */
  async publishDeleted(
    resourceType: string,
    data: Record<string, unknown>,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    const operationName = `on${resourceType}Deleted`;
    await this.publish(
      operationName,
      { [`${resourceType.toLowerCase()}Deleted`]: data },
      filters
    );
  }

  /**
   * Creates an async iterator for NestJS @Subscription decorator compatibility
   * @param operationName - The subscription operation name
   * @returns Async iterator (placeholder for serverless)
   * @remarks
   * - In serverless, actual delivery happens via API Gateway push
   * - This method exists for NestJS @Subscription decorator compatibility
   * - The iterator never yields - messages are pushed via WebSocket
   */
  asyncIterator<T>(operationName: string): AsyncIterator<T> {
    console.log("AsyncIterator created (serverless mode):", operationName);

    // Return a placeholder iterator for NestJS compatibility
    // In serverless, messages are pushed via API Gateway
    return {
      next: () =>
        new Promise<IteratorResult<T>>(() => {
          // Never resolves - messages pushed via API Gateway
        }),
      return: () => Promise.resolve({ value: undefined, done: true }),
      throw: (error: Error) => Promise.reject(error),
    };
  }

  /**
   * Sends a message to a WebSocket connection
   * @param connectionId - The API Gateway connectionId
   * @param message - The GraphQL-WS message to send
   */
  private async sendToConnection(
    connectionId: string,
    message: GraphQLWSNextMessage
  ): Promise<void> {
    const client = this.getApiGatewayClient();
    if (!client) {
      console.warn("API Gateway client not configured, skipping send");
      return;
    }

    try {
      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(message)),
        })
      );
    } catch (error) {
      if (error instanceof GoneException) {
        // Connection is stale - clean up
        console.log("Connection gone, cleaning up:", connectionId);
        await this.valkeyService.removeConnection(connectionId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Gets or creates the API Gateway Management API client
   * @returns The API Gateway client or null if not configured
   */
  private getApiGatewayClient(): ApiGatewayManagementApiClient | null {
    if (this.apiGatewayClient) {
      return this.apiGatewayClient;
    }

    const endpoint =
      this.config.apiGatewayEndpoint ?? configuration().websocket.apiEndpoint;
    if (!endpoint) {
      return null;
    }

    this.apiGatewayClient = new ApiGatewayManagementApiClient({ endpoint });
    return this.apiGatewayClient;
  }
}
