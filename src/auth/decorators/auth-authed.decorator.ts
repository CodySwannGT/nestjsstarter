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
 * ```typescript
 * \@Query(() => [Todo])
 * \@Authed()
 * async myTodos() { ... }
 * ```
 */
export function Authed() {
  return Extensions({
    [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.AUTHED }] },
  });
}
