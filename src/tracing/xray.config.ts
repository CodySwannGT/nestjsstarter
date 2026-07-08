/**
 * @file xray.config.ts
 * @description AWS X-Ray SDK initialization and configuration for Lambda environment
 * @module tracing
 * @remarks
 * This module initializes X-Ray at application startup. It must be imported
 * BEFORE any modules that use traced clients (http, https, pg).
 *
 * In Lambda, X-Ray automatically creates a facade segment. This module
 * configures context handling and patches supported libraries for automatic
 * distributed tracing.
 */
import { Logger } from "@nestjs/common";

const logger = new Logger("XRayConfig");

/**
 * Track whether X-Ray has been initialized to prevent redundant initialization
 * in warm Lambda instances where multiple handlers may be bundled together.
 * @remarks
 * Uses object property mutation (allowed by functional/immutable-data rule with
 * ignoreAccessorPattern) instead of reassignment to satisfy functional/no-let.
 */
const initState = { initialized: false };

/**
 * Whether the app runs without X-Ray infrastructure (local development).
 * @returns True when IS_OFFLINE=true
 */
function isOfflineMode(): boolean {
  return typeof process !== "undefined" && process.env?.IS_OFFLINE === "true";
}

/**
 * Initialize AWS X-Ray SDK for Lambda environment.
 * @description Configures X-Ray with appropriate settings for Lambda:
 * - Sets context missing strategy to LOG_ERROR (prevents crashes when context unavailable)
 * - Patches HTTP/HTTPS for automatic outbound request tracing
 * - Enables Promise context propagation
 * - Configures streaming threshold to handle large traces
 * @remarks
 * Must be called before any HTTP clients are imported. In offline mode
 * (IS_OFFLINE=true), initialization is skipped to allow local development
 * without X-Ray infrastructure.
 */
export function initializeXRay(): void {
  if (initState.initialized) {
    return;
  }

  if (isOfflineMode()) {
    Object.assign(initState, { initialized: true });
    logger.log("X-Ray disabled in offline mode");
    return;
  }

  try {
    // Dynamic require to handle graceful degradation when SDK unavailable

    const AWSXRay = require("aws-xray-sdk-core");

    // Prevent crashes when X-Ray context is unavailable (e.g., during cold start init)
    AWSXRay.setContextMissingStrategy("LOG_ERROR");

    // Patch HTTP/HTTPS modules for automatic outbound request tracing
    // This MUST happen before any HTTP clients are imported

    AWSXRay.captureHTTPsGlobal(require("http"));

    AWSXRay.captureHTTPsGlobal(require("https"));

    // Enable Promise context propagation
    AWSXRay.capturePromise();

    // Set streaming threshold to 0 to prevent 64KB segment size issues with GraphQL
    AWSXRay.setStreamingThreshold(0);

    Object.assign(initState, { initialized: true });
    logger.log("X-Ray initialized successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.warn(`X-Ray initialization failed: ${errorMessage}`);
  }
}

/**
 * Get the current X-Ray segment or null if unavailable.
 * @returns The current X-Ray segment, or null if X-Ray is not available
 *          or no active segment exists (e.g., during cold start initialization)
 * @remarks
 * Returns null in the following cases:
 * - X-Ray SDK is not installed
 * - No active Lambda segment exists
 * - Called outside of a traced context
 */
export function getXRaySegment(): unknown {
  // Offline mode never has a segment; asking the SDK anyway makes it log a
  // "Failed to get the current sub/segment" ERROR stack on every request
  if (isOfflineMode()) {
    return null;
  }

  try {
    const AWSXRay = require("aws-xray-sdk-core");

    // getSegment() returns undefined when no context exists, normalize to null
    return AWSXRay.getSegment() ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the X-Ray namespace for async context propagation.
 * @returns The X-Ray namespace, or null if X-Ray is not available
 * @remarks
 * The namespace is used for async context propagation across Promise chains.
 * Returns null when X-Ray SDK is not installed or not properly initialized.
 */
export function getXRayNamespace(): unknown {
  if (isOfflineMode()) {
    return null;
  }

  try {
    const AWSXRay = require("aws-xray-sdk-core");

    return AWSXRay.getNamespace();
  } catch {
    return null;
  }
}
