/**
 * @file auth.transformer.ts
 * @description GraphQL schema transformer for zero-trust authorization using extensions
 * @module auth
 */

import { MapperKind, mapSchema } from "@graphql-tools/utils";
import {
  defaultFieldResolver,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
  GraphQLSchema,
} from "graphql";
import {
  AuthContext,
  AuthLevel,
  AuthRule,
  AuthUser,
  FieldPermissions,
  Permission,
} from "./auth.types";
import { AUTH_EXTENSION_KEY } from "./decorators/auth-public.decorator";
import { FIELD_AUTH_EXTENSION_KEY } from "./decorators/field-auth.decorator";

/**
 * Error codes for authorization failures
 */
export enum AuthErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  MISSING_AUTH = "MISSING_AUTH",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  INVALID_TOKEN = "INVALID_TOKEN",
}

/**
 * Error thrown when authorization fails
 * @description Includes error code for programmatic error handling
 */
export class UnauthorizedError extends Error {
  /** Error code for programmatic handling */
  readonly code: AuthErrorCode;

  /** HTTP status code equivalent */
  readonly statusCode = 401;

  /**
   * Creates a new UnauthorizedError
   * @param message - Error message describing the authorization failure
   * @param code - Error code for programmatic handling
   */
  constructor(
    message: string,
    code: AuthErrorCode = AuthErrorCode.UNAUTHORIZED
  ) {
    super(message);
    this.name = "UnauthorizedError";
    this.code = code;
  }
}

/**
 * Auth extension shape stored on fields
 */
interface AuthExtension {
  readonly rules: readonly AuthRule[];
}

/**
 * Gets auth extension from field config
 * @param extensions - Field extensions object
 * @returns Auth extension if present, undefined otherwise
 */
export function getAuthExtension(
  extensions: Record<string, unknown> | undefined
): AuthExtension | undefined {
  return extensions?.[AUTH_EXTENSION_KEY] as AuthExtension | undefined;
}

/**
 * Gets field auth extension from field config
 * @param extensions - Field extensions object
 * @returns Field permissions if present, undefined otherwise
 */
export function getFieldAuthExtension(
  extensions: Record<string, unknown> | undefined
): FieldPermissions | undefined {
  return extensions?.[FIELD_AUTH_EXTENSION_KEY] as FieldPermissions | undefined;
}

/**
 * Checks if user passes the auth rule
 * @param user - Authenticated user (or undefined)
 * @param rule - Authorization rule to check
 * @param resourceOwnerId - Owner ID of the resource (for owner checks)
 * @returns Whether the user passes the rule
 */
export function checkAuthRule(
  user: AuthUser | undefined,
  rule: AuthRule,
  resourceOwnerId?: string
): boolean {
  switch (rule.allow) {
    case AuthLevel.PUBLIC:
      return true;

    case AuthLevel.AUTHED:
      return !!user;

    case AuthLevel.OWNER:
      return !!user && !!resourceOwnerId && user.id === resourceOwnerId;

    case AuthLevel.GROUPS:
      if (!user || !rule.groups) return false;
      return rule.groups.some(group => user.groups?.includes(group));

    default:
      return false;
  }
}

/**
 * Checks if user has permission for field access
 * @param user - Authenticated user (or undefined)
 * @param permissions - Field permissions configuration
 * @param permission - The permission type to check (read/write/delete)
 * @param resourceOwnerId - Owner ID of the resource (for owner checks)
 * @returns Whether the user has the required permission
 */
export function checkFieldPermission(
  user: AuthUser | undefined,
  permissions: FieldPermissions,
  permission: Permission,
  resourceOwnerId?: string
): boolean {
  const allowedLevels = permissions[permission];

  // If no permission specified, deny by default
  if (!allowedLevels || allowedLevels.length === 0) {
    return false;
  }

  return allowedLevels.some(level => {
    const rule: AuthRule = {
      allow: level,
      groups: permissions.groups,
      ownerField: permissions.ownerField,
    };
    return checkAuthRule(user, rule, resourceOwnerId);
  });
}

/**
 * Checks if rules include public access
 * @param rules - Array of auth rules to check
 * @returns True if any rule allows public access
 */
export function hasPublicAccess(rules: readonly AuthRule[]): boolean {
  return rules.some(rule => rule.allow === AuthLevel.PUBLIC);
}

/**
 * Creates a resolver that enforces operation-level auth rules, filtering out
 * OWNER rules that require a source object unavailable at operation level.
 * @param resolve - Original field resolver to delegate to after auth passes
 * @param rules - Auth rules declared on the operation
 * @param typeName - GraphQL type name used in error messages
 * @param fieldName - Field name used in error messages
 * @returns Async resolver that checks auth before delegating
 */
function createAuthResolver(
  resolve: GraphQLFieldResolver<unknown, AuthContext>,
  rules: readonly AuthRule[],
  typeName: string,
  fieldName: string
) {
  return async (
    source: unknown,
    args: Record<string, unknown>,
    context: AuthContext,
    info: unknown
  ) => {
    const user = context.req?.user;
    const applicableRules = rules.filter(
      rule => rule.allow !== AuthLevel.OWNER
    );
    const authorized = applicableRules.some(rule => checkAuthRule(user, rule));
    if (!authorized) {
      throw new UnauthorizedError(
        `Not authorized to access ${typeName}.${fieldName}`
      );
    }
    return resolve(source, args, context, info as never);
  };
}

/**
 * Logs a warning when OWNER auth is declared at operation level where no
 * source object is available to derive the owner from
 * @param typeName - GraphQL type name for the warning message
 * @param fieldName - Field name for the warning message
 */
function warnOwnerAtOperationLevel(typeName: string, fieldName: string): void {
  console.warn(
    `WARNING: ${typeName}.${fieldName} uses OWNER auth at operation level. ` +
      `OWNER auth should be used at field level where parent source is available. ` +
      `Consider using AUTHED or GROUPS instead, or implement ownership check in resolver.`
  );
}

/**
 * Maps a Query/Mutation field to enforce auth rules declared via decorators,
 * leaving non-operation fields unchanged
 * @param fieldConfig - GraphQL field configuration
 * @param fieldName - Field name used in error and warning messages
 * @param typeName - GraphQL type name used to gate operation-level auth
 * @returns Field config with auth resolver applied, or unchanged config
 */
function mapOperationField(
  fieldConfig: GraphQLFieldConfig<unknown, AuthContext>,
  fieldName: string,
  typeName: string
): GraphQLFieldConfig<unknown, AuthContext> {
  if (typeName !== "Query" && typeName !== "Mutation") {
    return fieldConfig;
  }

  const authExt = getAuthExtension(
    fieldConfig.extensions as Record<string, unknown> | undefined
  );

  if (!authExt) {
    throw new Error(
      `MISSING_AUTH: ${typeName}.${fieldName} must have auth extension. ` +
        `Use @Public() for public access or @Authed()/@Groups() for protected access.`
    );
  }

  const rules = authExt.rules;

  if (hasPublicAccess(rules)) {
    return fieldConfig;
  }

  if (rules.some(rule => rule.allow === AuthLevel.OWNER)) {
    warnOwnerAtOperationLevel(typeName, fieldName);
  }

  const { resolve = defaultFieldResolver } = fieldConfig;
  return {
    ...fieldConfig,
    resolve: createAuthResolver(resolve, rules, typeName, fieldName),
  };
}

/**
 * Transforms schema to enforce zero-trust authorization on operations
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with auth enforcement
 * @remarks
 * - Reads auth rules from field extensions (set by Public, Authed, Groups decorators)
 * - Supports PUBLIC, AUTHED, and GROUPS auth levels at operation level
 * - OWNER auth is not supported at operation level (use field-level auth instead)
 * - Operations without auth extension will throw at schema build time
 */
export function authExtensionTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: mapOperationField,
  });
}

/**
 * Creates a resolver that enforces field-level read permission, deriving the
 * resource owner from the source object when an ownerField is configured.
 * @param resolve - Original field resolver to delegate to after auth passes
 * @param permissions - Field permissions configuration
 * @param typeName - GraphQL type name used in error messages
 * @param fieldName - Field name used in error messages
 * @returns Async resolver that checks read permission before delegating
 */
function createFieldAuthResolver(
  resolve: GraphQLFieldResolver<unknown, AuthContext>,
  permissions: FieldPermissions,
  typeName: string,
  fieldName: string
) {
  return async (
    source: Record<string, unknown>,
    args: Record<string, unknown>,
    context: AuthContext,
    info: unknown
  ) => {
    const user = context.req?.user;
    const resourceOwnerId = permissions.ownerField
      ? (source?.[permissions.ownerField] as string)
      : undefined;
    const hasReadPermission = checkFieldPermission(
      user,
      permissions,
      Permission.READ,
      resourceOwnerId
    );
    if (!hasReadPermission) {
      throw new UnauthorizedError(
        `Not authorized to read field ${typeName}.${fieldName}`
      );
    }
    return resolve(source, args, context, info as never);
  };
}

/**
 * Transforms schema to enforce field-level authorization
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with field-level auth enforcement
 */
export function fieldAuthExtensionTransformer(
  schema: GraphQLSchema
): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      if (typeName === "Query" || typeName === "Mutation") {
        return fieldConfig;
      }

      const permissions = getFieldAuthExtension(
        fieldConfig.extensions as Record<string, unknown> | undefined
      );

      if (!permissions) {
        return fieldConfig;
      }

      const { resolve = defaultFieldResolver } = fieldConfig;
      return {
        ...fieldConfig,
        resolve: createFieldAuthResolver(
          resolve,
          permissions,
          typeName,
          fieldName
        ),
      };
    },
  });
}

/**
 * Combines both auth transformers into a single transformer
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with both operation and field-level auth
 */
export function combinedAuthTransformer(schema: GraphQLSchema): GraphQLSchema {
  const withOperationAuth = authExtensionTransformer(schema);
  return fieldAuthExtensionTransformer(withOperationAuth);
}
