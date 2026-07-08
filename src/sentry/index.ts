/**
 * @file index.ts
 * @description Barrel export for Sentry initialization utilities.
 * @module sentry
 * @remarks
 * Import from this module rather than individual files to keep a consistent
 * API surface, matching the `src/tracing` barrel convention.
 */

export { initializeSentry } from "./sentry.config";
