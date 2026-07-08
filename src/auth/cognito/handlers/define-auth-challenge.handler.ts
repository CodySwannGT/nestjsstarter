/**
 * @file define-auth-challenge.handler.ts
 * @description Cognito DefineAuthChallenge trigger for the passwordless OTP flow
 * @module auth/cognito/handlers
 * @remarks
 * Deploy-only Lambda entrypoint. It is wired to the Cognito user pool at deploy
 * time and is intentionally NOT imported by AppModule/main. The local app uses
 * LocalAuthService's mock OTP instead.
 */

import type { DefineAuthChallengeTriggerHandler } from "aws-lambda";

/** Maximum number of OTP attempts before authentication fails. */
const MAX_ATTEMPTS = 3;

/** The only challenge type this passwordless flow issues. */
const CUSTOM_CHALLENGE = "CUSTOM_CHALLENGE";

/** Event type accepted by the DefineAuthChallenge handler. */
type DefineAuthChallengeEvent =
  Parameters<DefineAuthChallengeTriggerHandler>[0];

/** Response override fields the handler may set. */
type AuthResponseOverrides = Partial<{
  issueTokens: boolean;
  failAuthentication: boolean;
  challengeName: string;
}>;

/**
 * Builds an auth response by merging override fields into the event's response.
 * @param event - The Cognito trigger event to build a response for
 * @param overrides - Response fields to merge (issueTokens, failAuthentication, challengeName)
 * @returns A new event object with the merged response
 */
function buildAuthResponse(
  event: DefineAuthChallengeEvent,
  overrides: AuthResponseOverrides
): DefineAuthChallengeEvent {
  return {
    ...event,
    response: {
      ...event.response,
      ...overrides,
    },
  };
}

/**
 * Decides the authentication outcome from the session challenge history.
 * @param session - Cognito session challenge history
 * @returns Response overrides describing the decision
 * @remarks
 * Fails on a non-custom challenge (should never happen) or once the maximum
 * wrong answers are exhausted; issues tokens on a correct custom answer;
 * otherwise requests another CUSTOM_CHALLENGE attempt.
 */
function decideOutcome(
  session: NonNullable<DefineAuthChallengeEvent["request"]["session"]>
): AuthResponseOverrides {
  const attempts = session.length;
  const lastAttempt = session[attempts - 1] ?? null;

  const hasNonCustomChallenge = session.some(
    attempt => attempt.challengeName !== CUSTOM_CHALLENGE
  );
  const hasExceededAttempts =
    attempts >= MAX_ATTEMPTS &&
    lastAttempt !== null &&
    lastAttempt.challengeResult === false;

  if (hasNonCustomChallenge || hasExceededAttempts) {
    return { issueTokens: false, failAuthentication: true };
  }

  if (
    attempts >= 1 &&
    lastAttempt !== null &&
    lastAttempt.challengeName === CUSTOM_CHALLENGE &&
    lastAttempt.challengeResult === true
  ) {
    return { issueTokens: true, failAuthentication: false };
  }

  return {
    issueTokens: false,
    failAuthentication: false,
    challengeName: CUSTOM_CHALLENGE,
  };
}

/**
 * Cognito DefineAuthChallenge trigger handler.
 * @param event - AWS Lambda event from Cognito DefineAuthChallenge trigger
 * @returns Modified event with the authentication decision
 * @remarks
 * Issues tokens once a CUSTOM_CHALLENGE is answered correctly, fails after the
 * maximum attempts are exhausted or a non-custom challenge appears, and
 * otherwise requests another CUSTOM_CHALLENGE attempt.
 */
export const defineAuthChallenge: DefineAuthChallengeTriggerHandler =
  async event => {
    if (!event?.request?.session) {
      return event;
    }
    return buildAuthResponse(event, decideOutcome(event.request.session));
  };
