/**
 * @file index.ts
 * @description Barrel export for Cognito custom-auth (passwordless OTP) Lambda triggers
 * @module auth/cognito/handlers
 * @remarks
 * These are deploy-only Lambda entrypoints attached to the Cognito user pool's
 * trigger configuration at deploy time. They are intentionally NOT imported by
 * AppModule/main so local/offline boot is unaffected.
 */

export { defineAuthChallenge } from "./define-auth-challenge.handler";
export { createAuthChallenge } from "./create-auth-challenge.handler";
export { verifyAuthChallengeResponse } from "./verify-auth-challenge-response.handler";
export { preSignUp } from "./pre-sign-up.handler";
export { preTokenGeneration } from "./pre-token-generation.handler";
