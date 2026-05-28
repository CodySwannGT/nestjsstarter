/**
 * @file auth-service.interface.ts
 * @description Interface for authentication services (Cognito and Local)
 * @module auth
 */

import { Request } from "express";
import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "../inputs/refresh-token.input";
import { ResendOtpInput } from "../inputs/resend-otp.input";
import { SignInInput } from "../inputs/sign-in.input";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { ConfirmSignInResult } from "../types/confirm-sign-in-result.type";
import { Message } from "../types/message.type";
import { SignInResult } from "../types/sign-in-result.type";

/**
 * Interface for authentication services
 * @description Defines the contract for both Cognito and Local auth implementations.
 * This interface ensures both AuthService (production) and LocalAuthService
 * (local development) provide the same public API for authentication operations.
 */
export interface IAuthService {
  /**
   * Initiates the sign-in flow by sending an OTP to the user
   * @param input - The sign-in input containing the user identifier (phone/email)
   * @returns A promise resolving to the sign-in result with session and challenge info
   */
  signIn(input: SignInInput): Promise<SignInResult>;

  /**
   * Confirms a sign-in attempt by verifying the OTP code
   * @param input - The confirmation input containing OTP code, identifier, and session
   * @param request - Optional Express request for device/location tracking
   * @returns A promise resolving to the confirmation result with auth tokens or error
   */
  confirmSignIn(
    input: ConfirmSignInInput,
    request?: Request
  ): Promise<ConfirmSignInResult>;

  /**
   * Refreshes authentication tokens using a refresh token
   * @param input - The refresh token input containing the refresh token
   * @returns A promise resolving to new authentication tokens with a message
   */
  refreshToken(
    input: RefreshTokenInput
  ): Promise<AuthenticationResultWithMessage>;

  /**
   * Signs out the user and invalidates their tokens
   * @param accessToken - The access token to invalidate
   * @param request - Optional Express request for activity logging
   * @returns A promise resolving to a message confirming sign-out
   */
  signOut(accessToken: string, request?: Request): Promise<Message>;

  /**
   * Resends the OTP code to the user
   * @param input - The resend OTP input containing the user identifier
   * @returns A promise resolving to the sign-in result with new session info
   */
  resendOTP(input: ResendOtpInput): Promise<SignInResult>;
}
