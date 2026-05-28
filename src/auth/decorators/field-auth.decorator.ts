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
 * ```typescript
 * \@Field(() => String)
 * \@FieldAuth({
 *   read: [AuthLevel.AUTHED],
 *   write: [AuthLevel.OWNER],
 * })
 * email: string;
 * ```
 */
export function FieldAuth(permissions: FieldPermissions) {
  return Extensions({ [FIELD_AUTH_EXTENSION_KEY]: permissions });
}
