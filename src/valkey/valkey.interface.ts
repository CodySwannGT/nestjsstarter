/**
 * @file valkey.interface.ts
 * @description TypeScript interfaces for Valkey connection and data types
 * @module valkey
 */

/**
 * Configuration options for Valkey connection
 * @description Defines the connection parameters for Valkey/Redis
 */
export interface ValkeyConfig {
  /** Hostname or IP address of the Valkey server */
  host: string;
  /** Port number for Valkey connection */
  port: number;
  /** Maximum number of retry attempts per request */
  maxRetriesPerRequest: number;
}

/**
 * WebSocket connection metadata stored in Valkey
 * @description Represents a connected WebSocket client
 */
export interface ConnectionData {
  /** Unique user identifier from JWT */
  userId: string;
  /** User's group memberships for authorization */
  groups: readonly string[];
  /** Timestamp when the connection was established */
  connectedAt: number;
}

/**
 * Subscription registration stored in Valkey
 * @description Represents an active GraphQL subscription
 */
export interface SubscriptionData {
  /** The WebSocket connectionId this subscription belongs to */
  connectionId: string;
  /** Unique identifier for this subscription (from graphql-ws) */
  subscriptionId: string;
  /** The GraphQL operation name */
  operationName: string;
  /** Filter criteria for this subscription */
  filters: SubscriptionFilters;
  /** Timestamp when the subscription was registered */
  registeredAt: number;
}

/**
 * Subscription filter criteria
 * @description Defines how subscription events are filtered
 */
export interface SubscriptionFilters {
  /** Filter by specific resource ID */
  resourceId?: string;
  /** Filter by owner user ID */
  ownerId?: string;
  /** Filter by organization ID */
  organizationId?: string;
}

/**
 * User context retrieved from Valkey for authorization
 * @description Contains user identity and permissions for subscription auth
 */
export interface UserContext {
  /** Unique user identifier */
  userId: string;
  /** User's group memberships */
  groups: readonly string[];
}

/** TTL for connection data in seconds (24 hours) */
export const CONNECTION_TTL_SECONDS = 86400;

/** Key prefix for connection data */
export const CONNECTION_PREFIX = "connection:";

/** Key prefix for subscription data */
export const SUBSCRIPTION_PREFIX = "subscription:";

/** Key prefix for subscription index by trigger */
export const TRIGGER_INDEX_PREFIX = "trigger";

/** Key prefix for connection's subscription index */
export const CONNECTION_SUBS_PREFIX = "connection-subs:";

/**
 * Builds a trigger key for subscription indexing
 * @param operationName - The GraphQL operation name
 * @param filters - Subscription filter criteria
 * @returns The trigger key
 */
export function buildTriggerKey(
  operationName: string,
  filters: SubscriptionFilters
): string {
  const baseParts = [TRIGGER_INDEX_PREFIX, operationName];
  const filterParts = [
    filters.resourceId ? `resource:${filters.resourceId}` : null,
    filters.ownerId ? `owner:${filters.ownerId}` : null,
    filters.organizationId ? `org:${filters.organizationId}` : null,
  ].filter((part): part is string => part !== null);

  return [...baseParts, ...filterParts].join(":");
}
