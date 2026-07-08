/**
 * @file create-auth-challenge.handler.ts
 * @description Cognito CreateAuthChallenge trigger — generates a passwordless OTP
 * @module auth/cognito/handlers
 * @remarks
 * Deploy-only Lambda entrypoint wired to the Cognito user pool at deploy time.
 * Intentionally NOT imported by AppModule/main; local dev uses LocalAuthService.
 *
 * OTP transport is abstracted behind {@link OtpDeliveryPort}. The default
 * adapter merely logs the code (offline-safe, no AWS/network), so this handler
 * has no SMS/SNS/SES coupling. The delivery destination is an opaque string, so
 * the same handler serves phone-number or email OTP without any phone-specific
 * logic.
 */

import type { CreateAuthChallengeTriggerHandler } from "aws-lambda";

import { defaultOtpDelivery } from "../delivery/console-otp-delivery.adapter";
import type { OtpDeliveryPort } from "../delivery/otp-delivery.port";

/** Maximum number of OTP attempts before authentication fails. */
const MAX_ATTEMPTS = 3;

/** Lowest 6-digit OTP value. */
const OTP_MIN = 100000;

/** Size of the 6-digit OTP range. */
const OTP_RANGE = 900000;

/**
 * Generates a random 6-digit OTP code.
 * @returns A 6-digit OTP code as a string (e.g. "123456")
 * @remarks Not cryptographically secure, but sufficient for a time-limited OTP.
 */
function generateCode(): string {
  // eslint-disable-next-line sonarjs/pseudo-random -- time-limited OTP, not a cryptographic secret
  return Math.floor(OTP_MIN + Math.random() * OTP_RANGE).toString();
}

/**
 * Resolves the OTP code to use for this attempt.
 * @param attempts - Number of previous challenge attempts
 * @param session - Cognito session challenge history
 * @returns A fresh code on the first attempt, otherwise the previously issued code
 * @remarks Reusing the code on retries prevents users from cycling codes to
 * bypass the attempt limit.
 */
function resolveOtpCode(
  attempts: number,
  session: readonly { readonly challengeMetadata?: string }[]
): string {
  if (attempts <= 0) {
    return generateCode();
  }
  const previous = session[session.length - 1]?.challengeMetadata ?? "";
  const match = /CODE-(\d+)/.exec(previous);
  return match ? match[1] : generateCode();
}

/**
 * Resolves the opaque OTP destination from the user attributes.
 * @param userAttributes - Cognito user attributes for the sign-in
 * @returns The delivery destination (phone number or email), or "" if absent
 */
function resolveDestination(userAttributes: Record<string, string>): string {
  return userAttributes.phone_number ?? userAttributes.email ?? "";
}

/** Event type accepted by the CreateAuthChallenge handler. */
type CreateAuthChallengeEvent =
  Parameters<CreateAuthChallengeTriggerHandler>[0];

/**
 * Builds the challenge response carrying the OTP and attempt metadata.
 * @param event - The Cognito trigger event to build a response for
 * @param otpCode - The OTP code issued for this attempt
 * @param attempts - Number of previous challenge attempts
 * @param destination - Opaque OTP destination echoed to the client
 * @returns The event with challenge parameters populated
 */
function buildChallengeResponse(
  event: CreateAuthChallengeEvent,
  otpCode: string,
  attempts: number,
  destination: string
): CreateAuthChallengeEvent {
  return {
    ...event,
    response: {
      ...event.response,
      challengeMetadata: `CODE-${otpCode}`,
      privateChallengeParameters: {
        secretLoginCode: otpCode,
      },
      publicChallengeParameters: {
        destination,
        maxAttempts: MAX_ATTEMPTS.toString(),
        attempts: attempts.toString(),
        attemptsLeft: (MAX_ATTEMPTS - attempts).toString(),
      },
    },
  };
}

/**
 * Builds a CreateAuthChallenge handler bound to the given OTP delivery port.
 * @param delivery - Transport used to deliver the OTP code (defaults to the console adapter)
 * @returns A Cognito CreateAuthChallenge trigger handler
 * @remarks
 * Generates a new OTP on the first attempt (and delivers it via the port),
 * reuses the code on retries, and never re-delivers on retries.
 */
export const createCreateAuthChallengeHandler =
  (
    delivery: OtpDeliveryPort = defaultOtpDelivery
  ): CreateAuthChallengeTriggerHandler =>
  async event => {
    if (!event?.request?.userAttributes) {
      return event;
    }

    const destination = resolveDestination(event.request.userAttributes);
    const session = event.request.session ?? [];
    const attempts = session.length;
    const otpCode = resolveOtpCode(attempts, session);

    if (attempts <= 0) {
      await delivery.deliver(destination, otpCode);
    }

    return buildChallengeResponse(event, otpCode, attempts, destination);
  };

/**
 * Default CreateAuthChallenge Lambda entrypoint using the console OTP adapter.
 */
export const createAuthChallenge = createCreateAuthChallengeHandler();
