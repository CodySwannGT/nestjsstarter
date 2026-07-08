/**
 * @file verify-auth-challenge-response.handler.ts
 * @description Cognito VerifyAuthChallengeResponse trigger for the OTP flow
 * @module auth/cognito/handlers
 * @remarks
 * Deploy-only Lambda entrypoint wired to the Cognito user pool at deploy time.
 * Intentionally NOT imported by AppModule/main; local dev uses LocalAuthService.
 */

import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";

/**
 * Cognito VerifyAuthChallengeResponse trigger handler.
 * @param event - AWS Lambda event from Cognito VerifyAuthChallengeResponse trigger
 * @returns Modified event with the `answerCorrect` flag set
 * @remarks
 * Compares the user's submitted answer against the secret login code stored in
 * the private challenge parameters using strict equality.
 */
export const verifyAuthChallengeResponse: VerifyAuthChallengeResponseTriggerHandler =
  async event => {
    const expectedAnswer =
      event.request?.privateChallengeParameters?.secretLoginCode;

    const answerCorrect = event?.request?.challengeAnswer === expectedAnswer;

    return {
      ...event,
      response: {
        ...event.response,
        answerCorrect,
      },
    };
  };
