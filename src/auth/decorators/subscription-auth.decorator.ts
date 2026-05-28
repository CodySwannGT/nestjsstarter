/**
 * @file subscription-auth.decorator.ts
 * @description Decorator for authorizing GraphQL subscriptions with filtering support
 * @module auth/decorators
 */

import { applyDecorators } from "@nestjs/common";
import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/** Extension key for subscription filter configuration */
export const SUBSCRIPTION_FILTER_KEY = "subscriptionFilter";

/**
 * Subscription filter options
 * @description Defines how subscription events are filtered for targeted delivery
 */
export interface SubscriptionFilterOptions {
  /** Filter by specific resource ID */
  readonly resourceId?: boolean;
  /** Filter to only owner's resources */
  readonly owner?: boolean;
  /** Filter by organization */
  readonly organization?: boolean;
}

/**
 * Options for SubscriptionAuth decorator
 * @description Configures authorization and filtering for subscriptions
 */
export interface SubscriptionAuthOptions {
  /** Authorization level: public, authed, groups, or owner */
  readonly auth: "public" | "authed" | "groups" | "owner";
  /** Required groups (for auth: "groups") */
  readonly groups?: readonly string[];
  /** Owner field name (for auth: "owner") */
  readonly ownerField?: string;
  /** Filter options for targeted event delivery */
  readonly filter?: SubscriptionFilterOptions;
}

/**
 * Authorizes GraphQL subscriptions with optional filtering
 * @param options - Authorization and filtering options
 * @returns Method decorator
 * @remarks
 * - Supports same auth levels as query/mutation decorators
 * - Filter options enable targeted delivery based on resourceId, owner, or organization
 * - Integrates with zero-trust auth enforcement
 * @example
 * ```typescript
 * \@Subscription(() => Post)
 * \@SubscriptionAuth({ auth: 'authed', filter: { owner: true } })
 * onPostCreated(@Args('ownerId') ownerId: string) {
 *   return this.pubSub.asyncIterator('onPostCreated');
 * }
 * ```
 */
export function SubscriptionAuth(options: SubscriptionAuthOptions) {
  const authLevel = mapAuthLevel(options.auth);

  const authExtension = buildAuthExtension(authLevel, options);
  const filterExtension = options.filter
    ? { [SUBSCRIPTION_FILTER_KEY]: options.filter }
    : {};

  return applyDecorators(
    Extensions({
      [AUTH_EXTENSION_KEY]: authExtension,
      ...filterExtension,
    })
  );
}

/**
 * Maps string auth option to AuthLevel enum
 * @param auth - String auth level
 * @returns AuthLevel enum value
 */
const mapAuthLevel = (auth: SubscriptionAuthOptions["auth"]): AuthLevel => {
  const mapping: Record<SubscriptionAuthOptions["auth"], AuthLevel> = {
    public: AuthLevel.PUBLIC,
    authed: AuthLevel.AUTHED,
    groups: AuthLevel.GROUPS,
    owner: AuthLevel.OWNER,
  };
  return mapping[auth];
};

/**
 * Auth rule structure for extension
 */
interface AuthRule {
  allow: AuthLevel;
  groups?: readonly string[];
  ownerField?: string;
}

/**
 * Builds auth extension object for the decorator
 * @param authLevel - The authorization level
 * @param options - The subscription auth options
 * @returns Auth extension object
 */
const buildAuthExtension = (
  authLevel: AuthLevel,
  options: SubscriptionAuthOptions
): { rules: readonly AuthRule[] } => {
  const rule: AuthRule = {
    allow: authLevel,
    ...(authLevel === AuthLevel.GROUPS && options.groups
      ? { groups: options.groups }
      : {}),
    ...(authLevel === AuthLevel.OWNER && options.ownerField
      ? { ownerField: options.ownerField }
      : {}),
  };

  return { rules: [rule] };
};

/**
 * Shorthand for public subscription authorization
 * @returns Method decorator
 * @example
 * ```typescript
 * \@Subscription(() => SystemEvent)
 * \@PublicSubscription()
 * onSystemEvent() { ... }
 * ```
 */
export function PublicSubscription() {
  return SubscriptionAuth({ auth: "public" });
}

/**
 * Shorthand for authenticated subscription authorization
 * @param filter - Optional filter options
 * @returns Method decorator
 * @example
 * ```typescript
 * \@Subscription(() => UserNotification)
 * \@AuthedSubscription({ owner: true })
 * onUserNotification() { ... }
 * ```
 */
export function AuthedSubscription(filter?: SubscriptionFilterOptions) {
  return SubscriptionAuth({ auth: "authed", filter });
}

/**
 * Shorthand for group-based subscription authorization
 * @param groups - Required group memberships
 * @param filter - Optional filter options
 * @returns Method decorator
 * @example
 * ```typescript
 * \@Subscription(() => AdminAlert)
 * \@GroupsSubscription(['admin'], { organization: true })
 * onAdminAlert() { ... }
 * ```
 */
export function GroupsSubscription(
  groups: readonly string[],
  filter?: SubscriptionFilterOptions
) {
  return SubscriptionAuth({ auth: "groups", groups, filter });
}

/**
 * Shorthand for owner-based subscription authorization
 * @param ownerField - Field name containing owner ID
 * @param filter - Optional filter options
 * @returns Method decorator
 * @example
 * ```typescript
 * \@Subscription(() => PrivateMessage)
 * \@OwnerSubscription('recipientId', { owner: true })
 * onPrivateMessage() { ... }
 * ```
 */
export function OwnerSubscription(
  ownerField?: string,
  filter?: SubscriptionFilterOptions
) {
  return SubscriptionAuth({ auth: "owner", ownerField, filter });
}
