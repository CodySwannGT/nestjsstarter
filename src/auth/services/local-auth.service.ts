/**
 * @file local-auth.service.ts
 * @description Local authentication service for development without Cognito
 * @module auth
 */

import { randomBytes } from "crypto";

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
import {
  decodeMockToken,
  generateDeterministicUserId,
  generateMockAccessToken,
  generateMockIdToken,
  generateMockRefreshToken,
  isTokenExpired,
} from "../utils/mock-jwt.util";

/**
 * Local session data stored in memory
 * @description Stores session state for OTP verification flow
 */
interface LocalSession {
  readonly identifier: string;
  readonly createdAt: number;
  readonly attempts: number;
}

/** Maximum OTP verification attempts allowed */
const MAX_ATTEMPTS = 3;

/** Magic OTP code that always succeeds in local development */
const MAGIC_OTP = "000000";

/**
 * Local authentication service for development
 * @description Provides authentication without AWS Cognito for local development
 * @remarks Sessions are stored in-memory and lost on server restart
 */
@Injectable()
export class LocalAuthService implements IAuthService {
  private readonly sessions = new Map<string, LocalSession>();

  /**
   * Generates a unique session ID
   * @returns Session ID in format local-session-{timestamp}-{random}
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex");
    return `local-session-${timestamp}-${random}`;
  }

  /**
   * Initiates sign-in process by creating a local session
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge data
   */
  async signIn(input: SignInInput): Promise<SignInResult> {
    const { identifier } = input;
    const sessionId = this.generateSessionId();

    const session: LocalSession = {
      identifier,
      createdAt: Date.now(),
      attempts: 0,
    };

    this.sessions.set(sessionId, session);

    return {
      message: "Code sent",
      data: {
        ChallengeName: "CUSTOM_CHALLENGE",
        Session: sessionId,
        ChallengeParameters: {
          USERNAME: identifier,
          maxAttempts: String(MAX_ATTEMPTS),
          attemptsLeft: String(MAX_ATTEMPTS),
        },
      },
    };
  }

  /**
   * Confirms sign-in by validating OTP code
   * @param input - Confirmation input with OTP and session
   * @returns Confirmation result with tokens or error
   * @remarks Magic OTP "000000" always succeeds in local development
   */
  async confirmSignIn(input: ConfirmSignInInput): Promise<ConfirmSignInResult> {
    const { otpCode, identifier, session } = input;

    const localSession = this.sessions.get(session);
    if (!localSession) {
      return {
        errorMessage: {
          message: "Invalid or expired session. Please sign in again.",
        },
      };
    }

    if (localSession.identifier !== identifier) {
      return {
        errorMessage: { message: "Identifier does not match session." },
      };
    }

    // Check magic OTP
    if (otpCode === MAGIC_OTP) {
      // Success - generate tokens and clean up session
      this.sessions.delete(session);

      const userId = generateDeterministicUserId(identifier);
      const isEmail = identifier.includes("@");
      const claims = isEmail
        ? { email: identifier }
        : { phone_number: identifier };

      return {
        authResult: {
          message: "Your identity has been verified",
          data: {
            accessToken: generateMockAccessToken(userId),
            idToken: generateMockIdToken(userId, claims),
            refreshToken: generateMockRefreshToken(userId),
            expiresIn: 3600,
            tokenType: "Bearer",
          },
        },
      };
    }

    // Wrong OTP - increment attempts
    const newAttempts = localSession.attempts + 1;
    const attemptsLeft = MAX_ATTEMPTS - newAttempts;

    if (attemptsLeft <= 0) {
      // Max attempts reached - invalidate session
      this.sessions.delete(session);
      return {
        errorMessage: {
          message: "Maximum attempts exceeded. Please sign in again.",
        },
      };
    }

    // Update session with new attempt count
    this.sessions.set(session, {
      ...localSession,
      attempts: newAttempts,
    });

    return {
      signInResult: {
        message: `Incorrect code. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
        data: {
          ChallengeName: "CUSTOM_CHALLENGE",
          Session: session,
          ChallengeParameters: {
            USERNAME: identifier,
            attempts: String(newAttempts),
            attemptsLeft: String(attemptsLeft),
            maxAttempts: String(MAX_ATTEMPTS),
          },
        },
      },
    };
  }

  /**
   * Refreshes authentication tokens using a refresh token
   * @param input - Refresh token input
   * @returns New authentication tokens or error message
   * @remarks In local development, validates token format and expiration only.
   * Returns error messages instead of throwing for consistent GraphQL error handling.
   */
  async refreshToken(
    input: RefreshTokenInput
  ): Promise<AuthenticationResultWithMessage> {
    const { refreshToken } = input;

    // Decode and validate the refresh token
    const payload = decodeMockToken(refreshToken);
    if (!payload) {
      return { message: "Invalid refresh token. Please sign in again." };
    }

    if (isTokenExpired(refreshToken)) {
      return { message: "Refresh token has expired. Please sign in again." };
    }

    if (payload.token_use !== "refresh") {
      return {
        message: "Invalid token type. Expected refresh token.",
      };
    }

    // Extract user ID and generate new tokens
    const userId = payload["custom:realUserId"] as string;
    const newAccessToken = generateMockAccessToken(userId);
    const newIdToken = generateMockIdToken(userId);

    return {
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
        idToken: newIdToken,
        refreshToken: refreshToken, // Return same refresh token
        expiresIn: 3600,
        tokenType: "Bearer",
      },
    };
  }

  /**
   * Signs out user from current session
   * @param _accessToken - JWT access token (unused in local mode)
   * @param _request - Express request object (unused in local mode)
   * @returns Success message
   * @remarks In local development, this is a no-op as tokens are not tracked
   */
  async signOut(_accessToken: string, _request?: Request): Promise<Message> {
    // Local development doesn't track issued tokens
    // Simply return success message
    return {
      message: "Sign out successful.",
    };
  }

  /**
   * Resends OTP code by creating a new session
   * @param input - Resend OTP input with identifier
   * @returns Sign-in result with new challenge data
   * @remarks This delegates to signIn as the behavior is identical
   */
  async resendOTP(input: ResendOtpInput): Promise<SignInResult> {
    return this.signIn(input);
  }
}
