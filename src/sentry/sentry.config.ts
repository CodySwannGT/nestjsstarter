/**
 * @file sentry.config.ts
 * @description Sentry SDK initialization for error tracking and performance
 * tracing. Runs at process startup, before the NestJS app is created.
 * @module sentry
 * @remarks
 * This module initializes the Sentry Node SDK. It MUST be imported and invoked
 * BEFORE any modules that Sentry auto-instruments (http, express, graphql, and
 * the NestJS framework), mirroring how X-Ray is initialized first in the
 * entrypoints.
 *
 * Sentry is completely inert unless `SENTRY_DSN` is set: with an empty DSN the
 * SDK is initialized with `enabled: false`, which installs a no-op client that
 * makes zero network calls and never throws. This preserves the zero-config
 * offline/local default — no env, no AWS, no network required to boot.
 */
import { Logger } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const logger = new Logger("SentryConfig");

/**
 * Default environment name reported to Sentry when none is configured.
 */
const DEFAULT_SENTRY_ENVIRONMENT = "development";

/**
 * Track whether Sentry has been initialized to prevent redundant
 * initialization in warm Lambda instances where the entrypoint module may be
 * evaluated more than once.
 * @remarks
 * Uses object property mutation (allowed by functional/immutable-data with
 * ignoreAccessorPattern) instead of reassignment to satisfy functional/no-let,
 * matching the X-Ray init pattern in `src/tracing/xray.config.ts`.
 */
const initState = { initialized: false };

/**
 * Parses a sample-rate environment variable into a number in the range [0, 1].
 * @param raw - The raw environment variable value, if any.
 * @returns The parsed rate, or `0` when unset or not a finite number.
 */
function parseSampleRate(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Initialize the Sentry SDK for the current process.
 * @description Reads configuration directly from environment variables because
 * initialization must happen before the NestJS ConfigService is available
 * (same constraint as X-Ray). When `SENTRY_DSN` is empty the SDK is
 * initialized disabled, so error capture, tracing, and profiling are all
 * inert with no network activity.
 * @remarks
 * - Idempotent: subsequent calls are no-ops.
 * - The Node profiling integration is only attached when a DSN is present, so
 *   its native addon is never loaded in the disabled/offline path.
 */
export function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN ?? "";
  const enabled = Boolean(dsn);

  if (initState.initialized) {
    return;
  }
  Object.assign(initState, { initialized: true });

  Sentry.init({
    dsn,
    enabled,
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.STAGE ??
      DEFAULT_SENTRY_ENVIRONMENT,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    profilesSampleRate: parseSampleRate(
      process.env.SENTRY_PROFILES_SAMPLE_RATE
    ),
    integrations: enabled ? [nodeProfilingIntegration()] : [],
  });

  logger.log(
    enabled ? "Sentry initialized" : "Sentry disabled (no SENTRY_DSN)"
  );
}
