/**
 * @file pre-token-generation.handler.ts
 * @description Cognito PreTokenGeneration trigger — documented pass-through
 * @module auth/cognito/handlers
 * @remarks
 * Deploy-only Lambda entrypoint wired to the Cognito user pool at deploy time.
 * Intentionally NOT imported by AppModule/main; local dev uses LocalAuthService.
 *
 * In the source system this trigger opened a TypeORM DataSource, ran a
 * find-or-create against the app's User entity, and injected the resulting
 * database UUID as a `realUserId` custom claim. That behaviour is inseparable
 * from a specific user store, so the generic starter reduces it to a
 * pass-through: it adds NO app-specific claims and preserves whatever claims
 * Cognito already produced. A production deployment layers its own user-id
 * resolution on top of this shape (add claims to
 * `response.claimsOverrideDetails.claimsToAddOrOverride`).
 */

import { Logger } from "@nestjs/common";
import type { PreTokenGenerationTriggerHandler } from "aws-lambda";

/** Default logger used when no logger is injected. */
const defaultLogger = new Logger("PreTokenGenerationTriggerHandler");

/**
 * Builds a PreTokenGeneration handler with an injectable logger.
 * @param logger - Logger instance (defaults to a module-level logger)
 * @returns A Cognito PreTokenGeneration trigger handler
 * @remarks
 * Returns the event unchanged (no app-specific claims). Warmup or malformed
 * invocations that carry no user attributes are also returned untouched.
 */
export const createPreTokenGenerationHandler =
  (logger: Logger = defaultLogger): PreTokenGenerationTriggerHandler =>
  async event => {
    if (!event?.request?.userAttributes) {
      // Warmup / malformed invocation — nothing to enrich.
      return event;
    }

    logger.debug(
      `Pre-token-generation pass-through for user ${event.userName}`
    );

    // Pass-through: intentionally add no app-specific claims. See file remarks.
    return event;
  };

/**
 * Default PreTokenGeneration Lambda entrypoint.
 */
export const preTokenGeneration = createPreTokenGenerationHandler();
