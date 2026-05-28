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
export function Owner(ownerField = "ownerId") {
  return Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.OWNER, ownerField }],
    },
  });
}
