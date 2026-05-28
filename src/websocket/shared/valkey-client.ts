/**
 * @file valkey-client.ts
 * @description Shared Valkey client for WebSocket Lambda handlers
 * @module websocket/shared
 * @remarks
 * This module runs outside NestJS context, so it uses configuration()
 * for type-safe configuration access instead of ConfigService.
 */

import Redis from "ioredis";
import { configuration } from "../../config/configuration";
import {
  buildTriggerKey,
  CONNECTION_PREFIX,
  CONNECTION_SUBS_PREFIX,
  CONNECTION_TTL_SECONDS,
  ConnectionData,
  SUBSCRIPTION_PREFIX,
  SubscriptionData,
  SubscriptionFilters,
} from "../../valkey/valkey.interface";

/** Singleton Valkey client instance (mutable singleton) */
// eslint-disable-next-line functional/no-let -- singleton pattern requires mutable cache
let valkeyClient: Redis | null = null;

/**
 * Gets or creates a Valkey client connection
 * @description Reuses connection across Lambda invocations in the same container
 * @returns Redis client instance
 */
export const getValkeyClient = (): Redis => {
  if (!valkeyClient) {
    const config = configuration();

    valkeyClient = new Redis({
      host: config.valkey.host,
      port: config.valkey.port,
      maxRetriesPerRequest: config.valkey.maxRetriesPerRequest,
      retryStrategy: times => {
        return Math.min(times * 50, 2000);
      },
    });

    valkeyClient.on("error", error => {
      console.error("Valkey connection error:", error);
    });
  }

  return valkeyClient;
};

/**
 * Stores a WebSocket connection with user data
 * @param connectionId - The API Gateway connectionId
 * @param data - Connection metadata including user context
 */
export const setConnection = async (
  connectionId: string,
  data: ConnectionData
): Promise<void> => {
  const key = `${CONNECTION_PREFIX}${connectionId}`;
  const serialized = JSON.stringify({
    ...data,
    groups: [...data.groups],
  });
  await getValkeyClient().setex(key, CONNECTION_TTL_SECONDS, serialized);
};

/**
 * Retrieves connection data by connectionId
 * @param connectionId - The API Gateway connectionId
 * @returns Connection data or null if not found
 */
export const getConnection = async (
  connectionId: string
): Promise<ConnectionData | null> => {
  const key = `${CONNECTION_PREFIX}${connectionId}`;
  const data = await getValkeyClient().get(key);
  return data ? (JSON.parse(data) as ConnectionData) : null;
};

/**
 * Removes a connection and all its subscriptions
 * @param connectionId - The API Gateway connectionId
 * @remarks Uses O(1) index lookup instead of KEYS command, and batches reads for atomicity
 */
export const removeConnection = async (connectionId: string): Promise<void> => {
  const client = getValkeyClient();
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
};

/**
 * Registers a subscription for a connection
 * @param connectionId - The API Gateway connectionId
 * @param subscriptionId - The graphql-ws subscription ID
 * @param operationName - The GraphQL operation name
 * @param filters - Subscription filter criteria
 */
export const registerSubscription = async (
  connectionId: string,
  subscriptionId: string,
  operationName: string,
  filters: SubscriptionFilters = {}
): Promise<void> => {
  const client = getValkeyClient();
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
  pipeline.setex(subscriptionKey, CONNECTION_TTL_SECONDS, JSON.stringify(data));
  pipeline.sadd(triggerKey, `${connectionId}:${subscriptionId}`);
  pipeline.expire(triggerKey, CONNECTION_TTL_SECONDS);
  // Add to connection index for O(1) cleanup on disconnect
  pipeline.sadd(connectionSubsKey, subscriptionId);
  pipeline.expire(connectionSubsKey, CONNECTION_TTL_SECONDS);

  await pipeline.exec();
};

/**
 * Removes a subscription
 * @param connectionId - The API Gateway connectionId
 * @param subscriptionId - The graphql-ws subscription ID
 */
export const unregisterSubscription = async (
  connectionId: string,
  subscriptionId: string
): Promise<void> => {
  const client = getValkeyClient();
  const subscriptionKey = `${SUBSCRIPTION_PREFIX}${connectionId}:${subscriptionId}`;
  const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${connectionId}`;

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
};

/**
 * Gets all subscribers for a trigger
 * @param operationName - The GraphQL operation name
 * @param filters - Optional filter criteria to match
 * @returns Array of subscription data
 * @remarks Uses mget for efficient batch retrieval
 */
export const getSubscribers = async (
  operationName: string,
  filters: SubscriptionFilters = {}
): Promise<readonly SubscriptionData[]> => {
  const client = getValkeyClient();
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
};
