/**
 * @file valkey.service.ts
 * @description NestJS service for Valkey connection management and operations
 * @module valkey
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { Configuration } from "../config/configuration";
import {
  buildTriggerKey,
  CONNECTION_PREFIX,
  CONNECTION_SUBS_PREFIX,
  CONNECTION_TTL_SECONDS,
  ConnectionData,
  SUBSCRIPTION_PREFIX,
  SubscriptionData,
  SubscriptionFilters,
  UserContext,
  ValkeyConfig,
} from "./valkey.interface";

/**
 * Service for Valkey connection management
 * @description Manages Valkey client lifecycle and provides operations for
 * WebSocket connection tracking and subscription storage
 * @remarks
 * - Connects on module initialization
 * - Disconnects gracefully on module destruction
 * - Uses ConfigService for type-safe configuration
 */
@Injectable()
export class ValkeyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ValkeyService.name);
  private client: Redis | null = null;

  /**
   * Creates a ValkeyService instance
   * @param configService - Configuration service for Valkey settings
   */
  constructor(
    private readonly configService: ConfigService<Configuration, true>
  ) {}

  /**
   * Initializes Valkey connection on module startup
   * @remarks Uses ConfigService for Valkey host and port
   */
  async onModuleInit(): Promise<void> {
    const config = this.getConfig();
    this.logger.log(`Connecting to Valkey at ${config.host}:${config.port}`);

    this.client = new Redis({
      host: config.host,
      port: config.port,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      retryStrategy: times => {
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on("error", error => {
      this.logger.error("Valkey connection error", error);
    });

    this.client.on("connect", () => {
      this.logger.log("Connected to Valkey");
    });
  }

  /**
   * Closes Valkey connection on module shutdown
   * @remarks Ensures graceful disconnection
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.logger.log("Disconnecting from Valkey");
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Gets the Valkey client instance
   * @returns The Redis client
   * @throws Error if client is not initialized
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error("Valkey client not initialized");
    }
    return this.client;
  }

  /**
   * Stores a WebSocket connection with user data
   * @param connectionId - The API Gateway connectionId
   * @param data - Connection metadata including user context
   */
  async setConnection(
    connectionId: string,
    data: ConnectionData
  ): Promise<void> {
    const key = `${CONNECTION_PREFIX}${connectionId}`;
    const serialized = JSON.stringify({
      ...data,
      groups: [...data.groups],
    });
    await this.getClient().setex(key, CONNECTION_TTL_SECONDS, serialized);
  }

  /**
   * Retrieves connection data by connectionId
   * @param connectionId - The API Gateway connectionId
   * @returns Connection data or null if not found
   */
  async getConnection(connectionId: string): Promise<ConnectionData | null> {
    const key = `${CONNECTION_PREFIX}${connectionId}`;
    const data = await this.getClient().get(key);
    return data ? (JSON.parse(data) as ConnectionData) : null;
  }

  /**
   * Retrieves user context for a connection
   * @param connectionId - The API Gateway connectionId
   * @returns User context or null if not found
   */
  async getConnectionUser(connectionId: string): Promise<UserContext | null> {
    const connection = await this.getConnection(connectionId);
    return connection
      ? { userId: connection.userId, groups: connection.groups }
      : null;
  }

  /**
   * Removes a connection and all its subscriptions
   * @param connectionId - The API Gateway connectionId
   * @remarks Uses O(1) index lookup instead of KEYS command, and batches reads for atomicity
   */
  async removeConnection(connectionId: string): Promise<void> {
    const client = this.getClient();
    const connectionKey = `${CONNECTION_PREFIX}${connectionId}`;
    const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${connectionId}`;

    // Get subscription IDs from the connection index (O(n) where n = subs for this connection)
    const subscriptionIds = await client.smembers(connectionSubsKey);

    // Build subscription keys for batch fetch
    const subscriptionKeys = subscriptionIds.map(
      subId => `${SUBSCRIPTION_PREFIX}${connectionId}:${subId}`
    );

    // Fetch all subscription data in one call for atomicity
    const subscriptionDataList =
      subscriptionKeys.length > 0 ? await client.mget(...subscriptionKeys) : [];

    // Build pipeline with all operations (no awaits inside loop)
    const pipeline = client.pipeline();
    pipeline.del(connectionKey);
    pipeline.del(connectionSubsKey);

    subscriptionDataList.forEach((data, index) => {
      if (data) {
        const subscription = JSON.parse(data) as SubscriptionData;
        const triggerKey = buildTriggerKey(
          subscription.operationName,
          subscription.filters
        );
        pipeline.srem(triggerKey, `${connectionId}:${subscriptionIds[index]}`);
      }
      pipeline.del(subscriptionKeys[index]);
    });

    await pipeline.exec();
  }

  /**
   * Registers a subscription for a connection
   * @param connectionId - The API Gateway connectionId
   * @param subscriptionId - The graphql-ws subscription ID
   * @param operationName - The GraphQL operation name
   * @param filters - Subscription filter criteria
   */
  async registerSubscription(
    connectionId: string,
    subscriptionId: string,
    operationName: string,
    filters: SubscriptionFilters = {}
  ): Promise<void> {
    const client = this.getClient();
    const data: SubscriptionData = {
      connectionId,
      subscriptionId,
      operationName,
      filters,
      registeredAt: Date.now(),
    };

    const subscriptionKey = `${SUBSCRIPTION_PREFIX}${connectionId}:${subscriptionId}`;
    const triggerKey = buildTriggerKey(operationName, filters);
    const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${connectionId}`;

    const pipeline = client.pipeline();
    pipeline.setex(
      subscriptionKey,
      CONNECTION_TTL_SECONDS,
      JSON.stringify(data)
    );
    pipeline.sadd(triggerKey, `${connectionId}:${subscriptionId}`);
    pipeline.expire(triggerKey, CONNECTION_TTL_SECONDS);
    // Add to connection index for O(1) cleanup on disconnect
    pipeline.sadd(connectionSubsKey, subscriptionId);
    pipeline.expire(connectionSubsKey, CONNECTION_TTL_SECONDS);

    await pipeline.exec();
  }

  /**
   * Removes a subscription
   * @param connectionId - The API Gateway connectionId
   * @param subscriptionId - The graphql-ws subscription ID
   */
  async unregisterSubscription(
    connectionId: string,
    subscriptionId: string
  ): Promise<void> {
    const client = this.getClient();
    const subscriptionKey = `${SUBSCRIPTION_PREFIX}${connectionId}:${subscriptionId}`;
    const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${connectionId}`;

    // Get subscription data to find trigger key
    const data = await client.get(subscriptionKey);
    if (data) {
      const subscription = JSON.parse(data) as SubscriptionData;
      const triggerKey = buildTriggerKey(
        subscription.operationName,
        subscription.filters
      );

      const pipeline = client.pipeline();
      pipeline.del(subscriptionKey);
      pipeline.srem(triggerKey, `${connectionId}:${subscriptionId}`);
      // Remove from connection index
      pipeline.srem(connectionSubsKey, subscriptionId);
      await pipeline.exec();
    }
  }

  /**
   * Gets all subscribers for a trigger
   * @param operationName - The GraphQL operation name
   * @param filters - Optional filter criteria to match
   * @returns Array of subscription data
   * @remarks Uses mget for efficient batch retrieval
   */
  async getSubscribers(
    operationName: string,
    filters: SubscriptionFilters = {}
  ): Promise<readonly SubscriptionData[]> {
    const client = this.getClient();
    const triggerKey = buildTriggerKey(operationName, filters);

    const members = await client.smembers(triggerKey);
    if (members.length === 0) {
      return [];
    }

    // Build keys and fetch all in one call
    const subscriptionKeys = members.map(
      member => `${SUBSCRIPTION_PREFIX}${member}`
    );
    const dataList = await client.mget(...subscriptionKeys);

    // Filter out nulls and parse
    return dataList
      .filter((data): data is string => data !== null)
      .map(data => JSON.parse(data) as SubscriptionData);
  }

  /**
   * Publishes a message to a Valkey channel
   * @param channel - The channel name
   * @param message - The message to publish
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.getClient().publish(channel, message);
  }

  /**
   * Builds configuration from ConfigService
   * @returns Valkey configuration
   */
  private getConfig(): ValkeyConfig {
    return {
      host: this.configService.get("valkey.host", { infer: true }),
      port: this.configService.get("valkey.port", { infer: true }),
      maxRetriesPerRequest: this.configService.get(
        "valkey.maxRetriesPerRequest",
        { infer: true }
      ),
    };
  }
}
