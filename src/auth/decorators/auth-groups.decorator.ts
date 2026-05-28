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
 * ```typescript
 * \@Mutation(() => Boolean)
 * \@Groups("ADMINS", "MODERATORS")
 * async deleteUser() { ... }
 * ```
 */
export function Groups(...groups: string[]) {
  return Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.GROUPS, groups }],
    },
  });
}
