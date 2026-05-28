# Task 10: Implement Auth Types and Decorators

## Objective
Create the zero-trust authorization types and decorators using @Extensions() approach.

## Files to Create

### 1. src/auth/auth.types.ts
```typescript
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
```

### 2. src/auth/decorators/auth-public.decorator.ts
```typescript
/**
 * @file auth-public.decorator.ts
 * @description Decorator marking operation as publicly accessible
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";

/** Extension key for auth rules */
export const AUTH_EXTENSION_KEY = "auth";

/**
 * Marks a Query/Mutation as publicly accessible (no auth required)
 * @returns Method decorator
 * @example
 * @Query(() => String)
 * @Public()
 * async healthCheck() { return "OK"; }
 */
export const Public = () =>
  Extensions({ [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] } });
```

### 3. src/auth/decorators/auth-authed.decorator.ts
```typescript
/**
 * @file auth-authed.decorator.ts
 * @description Decorator requiring any authenticated user
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires any authenticated user to access the operation
 * @returns Method decorator
 * @example
 * @Query(() => [Todo])
 * @Authed()
 * async myTodos() { ... }
 */
export const Authed = () =>
  Extensions({ [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.AUTHED }] } });
```

### 4. src/auth/decorators/auth-owner.decorator.ts
```typescript
/**
 * @file auth-owner.decorator.ts
 * @description Decorator requiring resource ownership
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires authenticated user to be the resource owner
 * @param ownerField - Field name containing owner ID (default: "ownerId")
 * @returns Method decorator
 * @remarks
 * **IMPORTANT**: This decorator is designed for **field-level** authorization only.
 * At the operation level (Query/Mutation), there is no parent source object to check
 * ownership against. If used at operation level, a warning will be logged.
 */
export const Owner = (ownerField = "ownerId") =>
  Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.OWNER, ownerField }],
    },
  });
```

### 5. src/auth/decorators/auth-groups.decorator.ts
```typescript
/**
 * @file auth-groups.decorator.ts
 * @description Decorator requiring group membership
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires authenticated user to be member of specified groups
 * @param groups - Group names required for access
 * @returns Method decorator
 * @example
 * @Mutation(() => Boolean)
 * @Groups("ADMINS", "MODERATORS")
 * async deleteUser() { ... }
 */
export const Groups = (...groups: string[]) =>
  Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.GROUPS, groups }],
    },
  });
```

### 6. src/auth/decorators/field-auth.decorator.ts
```typescript
/**
 * @file field-auth.decorator.ts
 * @description Decorator for field-level permissions
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { FieldPermissions } from "../auth.types";

/** Extension key for field-level auth permissions */
export const FIELD_AUTH_EXTENSION_KEY = "fieldAuth";

/**
 * Defines read/write/delete permissions for a field
 * @param permissions - Permission configuration for the field
 * @returns Property decorator
 * @example
 * @Field(() => String)
 * @FieldAuth({
 *   read: [AuthLevel.AUTHED],
 *   write: [AuthLevel.OWNER],
 * })
 * email: string;
 */
export const FieldAuth = (permissions: FieldPermissions) =>
  Extensions({ [FIELD_AUTH_EXTENSION_KEY]: permissions });
```

### 7. src/auth/index.ts (Barrel Export)
```typescript
/**
 * @file index.ts
 * @description Public API for auth module
 * @module auth
 */

export * from "./auth.types";
export * from "./decorators/auth-public.decorator";
export * from "./decorators/auth-authed.decorator";
export * from "./decorators/auth-owner.decorator";
export * from "./decorators/auth-groups.decorator";
export * from "./decorators/field-auth.decorator";
```

### 8. src/auth/auth.module.ts
```typescript
/**
 * @file auth.module.ts
 * @description NestJS module for zero-trust authorization
 * @module auth
 */

import { Module } from "@nestjs/common";

/**
 * Module providing authorization functionality
 * @description Exports auth decorators and types for use across the application
 */
@Module({
  providers: [],
  exports: [],
})
export class AuthModule {}
```

## Acceptance Criteria
- [ ] All types properly defined
- [ ] All decorators use @Extensions() approach
- [ ] Barrel export includes all public APIs
- [ ] JSDoc documentation on all exports
- [ ] No linting errors

## Verification
```bash
bun run build
bun run lint src/auth/
```
