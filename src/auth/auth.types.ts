/**
 * @file auth.types.ts
 * @description Type definitions for zero-trust authorization system
 * @module auth
 */

/**
 * Authorization levels for operations and fields
 */
export enum AuthLevel {
  PUBLIC = "public",
  AUTHED = "authed",
  OWNER = "owner",
  GROUPS = "groups",
}

/**
 * Permission types for field-level access
 */
export enum Permission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
}

/**
 * Authorization rule for operations
 */
export interface AuthRule {
  readonly allow: AuthLevel;
  readonly groups?: readonly string[];
  readonly ownerField?: string;
}

/**
 * Field-level permission configuration
 */
export interface FieldPermissions {
  readonly read?: readonly AuthLevel[];
  readonly write?: readonly AuthLevel[];
  readonly delete?: readonly AuthLevel[];
  readonly groups?: readonly string[];
  readonly ownerField?: string;
}

/**
 * GraphQL context with authenticated user
 */
export interface AuthContext {
  readonly req: {
    readonly user?: AuthUser;
  };
}

/**
 * Authenticated user from JWT/Cognito
 */
export interface AuthUser {
  readonly id: string;
  readonly sub: string;
  readonly groups?: readonly string[];
  readonly organizationId?: string;
}
