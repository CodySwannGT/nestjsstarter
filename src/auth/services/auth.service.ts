/**
 * @file auth.service.ts
 * @description Production authentication service using AWS Cognito
 * @module auth
 */

import { Injectable } from "@nestjs/common";
import { Request } from "express";

import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "../inputs/refresh-token.input";
import { ResendOtpInput } from "../inputs/resend-otp.input";
import { SignInInput } from "../inputs/sign-in.input";
import { IAuthService } from "../interfaces/auth-service.interface";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { ConfirmSignInResult } from "../types/confirm-sign-in-result.type";
import { Message } from "../types/message.type";
import { SignInResult } from "../types/sign-in-result.type";
import { CognitoService } from "./cognito.service";

/**
 * Production authentication service
 * @description Implements authentication using AWS Cognito
 */
@Injectable()
export class AuthService implements IAuthService {
  /**
   * Creates an AuthService instance
   * @param cognitoService - Cognito service for authentication operations
   */
  constructor(private readonly cognitoService: CognitoService) {}

  /**
   * Initiates sign-in process
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge
   */
  async signIn(input: SignInInput): Promise<SignInResult> {
    const result = await this.cognitoService.initiateAuthCustom(
      input.identifier
    );
    return this.cognitoService.createSignInResult("Code sent", result);
  }

  /**
   * Confirms sign-in with OTP verification
   * @param input - Confirmation input with OTP
   * @param _request - Express request (unused, for interface compatibility)
   * @returns Confirmation result with tokens or error
   */
  async confirmSignIn(
    input: ConfirmSignInInput,
    _request?: Request
  ): Promise<ConfirmSignInResult> {
    try {
      const result = await this.cognitoService.respondToAuthChallenge(input);

      // Authentication successful - return tokens
      if (!result.ChallengeName) {
        return {
          authResult: this.cognitoService.createConfirmSignInResult(
            "Your identity has been verified",
            result
          ),
        };
      }

      // Challenge continues - return updated challenge info
      const attemptsLeft =
        result.ChallengeParameters?.["attemptsLeft"] ?? "unknown";
      return {
        signInResult: this.cognitoService.createSignInResult(
          `You have ${attemptsLeft} attempts left`,
          result
        ),
      };
    } catch (error) {
      return {
        errorMessage: this.cognitoService.handleErrorConfirmSignin(
          error as Error
        ),
      };
    }
  }

  /**
   * Refreshes authentication tokens
   * @param input - Refresh token input
   * @returns New authentication tokens
   */
  async refreshToken(
    input: RefreshTokenInput
  ): Promise<AuthenticationResultWithMessage> {
    const result = await this.cognitoService.refreshToken(input.refreshToken);
    return this.cognitoService.createConfirmSignInResult(
      "Token refreshed",
      result
    );
  }

  /**
   * Signs out user
   * @param accessToken - User's access token
   * @param _request - Express request (unused)
   * @returns Success message
   */
  async signOut(accessToken: string, _request?: Request): Promise<Message> {
    await this.cognitoService.globalSignOut(accessToken);
    return { message: "Sign out successful." };
  }

  /**
   * Resends OTP code
   * @param input - Resend OTP input
   * @returns Sign-in result with new challenge
   */
  async resendOTP(input: ResendOtpInput): Promise<SignInResult> {
    return this.signIn(input);
  }
}
