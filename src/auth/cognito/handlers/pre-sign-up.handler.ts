/**
 * @file pre-sign-up.handler.ts
 * @description Cognito PreSignUp trigger for the passwordless OTP flow
 * @module auth/cognito/handlers
 * @remarks
 * Deploy-only Lambda entrypoint wired to the Cognito user pool at deploy time.
 * Intentionally NOT imported by AppModule/main; local dev uses LocalAuthService.
 */

import type { PreSignUpTriggerHandler } from "aws-lambda";

/**
 * Cognito PreSignUp trigger handler.
 * @param event - AWS Lambda event from Cognito PreSignUp trigger
 * @returns Modified event with auto-confirmation enabled
 * @remarks
 * Passwordless sign-up has no password to confirm, so the user is auto-confirmed
 * and whichever contact attribute is present (phone and/or email) is
 * auto-verified. This is a generic policy with no app-specific coupling.
 */
export const preSignUp: PreSignUpTriggerHandler = async event => {
  const userAttributes = event?.request?.userAttributes ?? {};

  return {
    ...event,
    response: {
      ...event.response,
      autoConfirmUser: true,
      ...(userAttributes.phone_number ? { autoVerifyPhone: true } : {}),
      ...(userAttributes.email ? { autoVerifyEmail: true } : {}),
    },
  };
};
