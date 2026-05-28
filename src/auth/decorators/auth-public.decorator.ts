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
 * ```typescript
 * \@Query(() => String)
 * \@Public()
 * async healthCheck() { return "OK"; }
 * ```
 */
export function Public() {
  return Extensions({
    [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] },
  });
}
