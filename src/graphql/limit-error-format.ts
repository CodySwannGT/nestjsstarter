/**
 * @file limit-error-format.ts
 * @description Apollo `formatError` hook that restores the depth-limit error
 * code (`QUERY_TOO_DEEP`) at the HTTP layer.
 *
 * WHY this is necessary: when a validation rule reports a `GraphQLError`,
 * Apollo Server wraps it in its internal `ValidationError`, which
 * force-overwrites `extensions.code` to `GRAPHQL_VALIDATION_FAILED` (it spreads
 * the original extensions, then sets `code` last — see
 * `@apollo/server/.../internalErrorClasses.js`). So a rule CANNOT surface its
 * own `code` on its own; the client would always see
 * `GRAPHQL_VALIDATION_FAILED` instead of the contract code. Apollo does,
 * however, preserve the original error on `originalError`, and passes it as
 * the second argument to `formatError`. We read our code back from that chain
 * and restore it.
 *
 * REALM-SAFE: this only reads plain object properties (`extensions.code`,
 * `originalError`) — no `instanceOf`/graphql type guards — so it cannot trip
 * the cross-realm hazard the native depth rule is designed around.
 * @module graphql
 */

import type { GraphQLFormattedError } from "graphql";
import { QUERY_TOO_DEEP } from "./graphql-limits.constants";

/** The limit codes this hook is responsible for restoring. */
const LIMIT_CODES: ReadonlySet<string> = new Set([QUERY_TOO_DEEP]);

/**
 * Walk an error and its `originalError` chain (depth-bounded) for one of our
 * limit codes.
 * @param error - The error (or wrapped error) to inspect.
 * @param depth - Current chain depth, bounded to avoid pathological recursion.
 * @returns The limit code if found, otherwise `undefined`.
 */
const extractLimitCode = (error: unknown, depth = 0): string | undefined => {
  if (!error || typeof error !== "object" || depth > 5) return undefined;
  const code = (error as { extensions?: { code?: unknown } }).extensions?.code;
  if (typeof code === "string" && LIMIT_CODES.has(code)) return code;
  return extractLimitCode(
    (error as { originalError?: unknown }).originalError,
    depth + 1
  );
};

/**
 * Apollo `formatError` hook: if the error originated from the depth-limit
 * validation rule, restore the contract `extensions.code`; otherwise pass the
 * formatted error through unchanged (zero impact on all other errors).
 * @param formattedError - The error Apollo has already formatted.
 * @param error - The original (pre-format) error, including its `originalError`.
 * @returns The formatted error, with `extensions.code` restored when applicable.
 */
export const formatLimitError = (
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError => {
  const code = extractLimitCode(error);
  if (!code) return formattedError;
  return {
    ...formattedError,
    extensions: { ...formattedError.extensions, code },
  };
};
