/**
 * @file cognito.service.ts
 * @description Service for AWS Cognito authentication operations
 * @module auth/services
 */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminInitiateAuthCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";

import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { SignInResult } from "../types/sign-in-result.type";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { Message } from "../types/message.type";

/**
 * Cognito authentication response structure
 * @description Represents the response from Cognito initiate auth
 */
interface CognitoAuthResponse {
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
}

/**
 * Cognito authentication result response structure
 * @description Represents the response from Cognito containing tokens
 */
interface CognitoAuthResultResponse {
  AuthenticationResult?: {
    AccessToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
    RefreshToken?: string;
    IdToken?: string;
  };
}

/**
 * Combined Cognito response for challenge operations
 * @description Includes both challenge fields and auth result from RespondToAuthChallenge
 */
interface CognitoChallengeResponse
  extends CognitoAuthResponse, CognitoAuthResultResponse {}

/**
 * Service for AWS Cognito authentication
 * @description Handles direct communication with AWS Cognito for authentication
 */
@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  /**
   * Creates a CognitoService instance
   * @param configService - Configuration service for AWS settings
   * @remarks
   * Uses `|| "us-east-1"` fallback rather than the ConfigService default parameter
   * because the AWS SDK treats empty strings as missing regions, while ConfigService
   * only applies its default when the value is undefined (not when it's an empty string).
   */
  constructor(private readonly configService: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: this.configService.get<string>("AWS_REGION") || "us-east-1",
    });
    this.userPoolId = this.configService.get<string>(
      "COGNITO_USER_POOL_ID",
      ""
    );
    this.clientId = this.configService.get<string>("COGNITO_CLIENT_ID", "");
  }

  /**
   * Initiates custom auth flow with Cognito
   * @param identifier - Email or phone number
   * @returns Cognito auth response
   */
  async initiateAuthCustom(identifier: string): Promise<CognitoAuthResponse> {
    const command = new InitiateAuthCommand({
      ClientId: this.clientId,
      AuthFlow: AuthFlowType.CUSTOM_AUTH,
      AuthParameters: {
        USERNAME: identifier,
      },
    });
    return this.client.send(command);
  }

  /**
   * Responds to auth challenge (OTP verification)
   * @param input - Challenge response input
   * @returns Cognito challenge response with auth result or new challenge
   */
  async respondToAuthChallenge(
    input: ConfirmSignInInput
  ): Promise<CognitoChallengeResponse> {
    const command = new RespondToAuthChallengeCommand({
      ClientId: this.clientId,
      ChallengeName: ChallengeNameType.CUSTOM_CHALLENGE,
      Session: input.session,
      ChallengeResponses: {
        ANSWER: input.otpCode,
        USERNAME: input.identifier,
      },
    });
    return this.client.send(command);
  }

  /**
   * Refreshes authentication tokens
   * @param refreshToken - Valid refresh token
   * @returns New authentication tokens
   */
  async refreshToken(refreshToken: string): Promise<CognitoAuthResultResponse> {
    const command = new AdminInitiateAuthCommand({
      UserPoolId: this.userPoolId,
      ClientId: this.clientId,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });
    return this.client.send(command);
  }

  /**
   * Signs out user globally
   * @param accessToken - User's access token
   */
  async globalSignOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });
    await this.client.send(command);
  }

  /**
   * Creates SignInResult from Cognito response
   * @param message - Status message
   * @param result - Cognito auth response
   * @returns Formatted sign-in result
   */
  createSignInResult(
    message: string,
    result: CognitoAuthResponse
  ): SignInResult {
    return {
      message,
      data: {
        ChallengeName: result.ChallengeName,
        Session: result.Session,
        ChallengeParameters: result.ChallengeParameters ?? {},
      },
    };
  }

  /**
   * Creates AuthenticationResultWithMessage from Cognito response
   * @param message - Status message
   * @param result - Cognito auth response
   * @returns Formatted auth result
   */
  createConfirmSignInResult(
    message: string,
    result: CognitoAuthResultResponse
  ): AuthenticationResultWithMessage {
    return {
      message,
      data: result.AuthenticationResult
        ? {
            accessToken: result.AuthenticationResult.AccessToken,
            expiresIn: result.AuthenticationResult.ExpiresIn,
            tokenType: result.AuthenticationResult.TokenType,
            refreshToken: result.AuthenticationResult.RefreshToken,
            idToken: result.AuthenticationResult.IdToken,
          }
        : undefined,
    };
  }

  /**
   * Handles errors from confirm sign-in
   * @param error - Error from Cognito
   * @returns Formatted error message
   * @throws Re-throws error if not a known Cognito error
   */
  handleErrorConfirmSignin(error: Error): Message {
    if (error.message === "Invalid session for the user.") {
      return {
        message: "Your login session has expired. Please log in again.",
      };
    }

    // Cognito returns this generic message for invalid OTP codes
    if (error.message === "Incorrect username or password.") {
      return {
        message:
          "The verification code is not valid, please request a new one.",
      };
    }

    throw error;
  }
}
