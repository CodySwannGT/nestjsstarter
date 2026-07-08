/**
 * @file graphql-limits.constants.ts
 * @description Shared constants for the GraphQL abuse-mitigation layer (the
 * native depth-limit validation rule and the batched-HTTP-POST operation cap).
 * The configurable thresholds themselves (max depth, batch cap) live in
 * `src/config/configuration.ts` with env overrides; this file holds only the
 * values that are structural to the analysis itself plus the non-leaky error
 * codes surfaced to clients.
 * @module graphql
 */

/**
 * Recursion guard for the depth validation rule. A document nested deeper than
 * this is, by definition, over any sane configured depth limit, so analysis can
 * bail early — bounding the cost of analysing a hostile (deeply nested or
 * cyclic) document.
 */
export const MAX_VALIDATION_DEPTH = 50;

/**
 * Non-leaky error code for an operation that exceeds the configured maximum
 * depth. Surfaced in `extensions.code`.
 */
export const QUERY_TOO_DEEP = "QUERY_TOO_DEEP";

/**
 * Non-leaky error code for a batched POST that exceeds the configured maximum
 * operations per request. Surfaced in `extensions.code` of the pre-Apollo 400
 * response.
 */
export const BATCH_TOO_LARGE = "BATCH_TOO_LARGE";
