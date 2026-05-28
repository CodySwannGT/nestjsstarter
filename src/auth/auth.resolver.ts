/**
 * @file auth.resolver.ts
 * @description GraphQL resolver for authentication operations
 * @module auth
 */

import { Inject } from "@nestjs/common";
import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { Request } from "express";

import { Public } from "./decorators/auth-public.decorator";
import { ConfirmSignInInput } from "./inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "./inputs/refresh-token.input";
import { ResendOtpInput } from "./inputs/resend-otp.input";
import { SignInInput } from "./inputs/sign-in.input";
import type { IAuthService } from "./interfaces/auth-service.interface";
import { AUTH_SERVICE } from "./providers/auth-service.provider";
import { AuthenticationResultWithMessage } from "./types/authentication-result-with-message.type";
import { ConfirmSignInResult } from "./types/confirm-sign-in-result.type";
import { Message } from "./types/message.type";
import { SignInResult } from "./types/sign-in-result.type";

/**
 * GraphQL context interface
 * @description Provides access to Express request in resolver context
 */
interface GraphQLContext {
  readonly req: Request;
}

/**
 * GraphQL resolver for authentication
 * @description Exposes authentication mutations for sign-in, sign-out, and token refresh
 */
@Resolver(() => String)
export class AuthResolver {
  /**
   * Creates an AuthResolver instance
   * @param authService - Authentication service for handling auth operations
   */
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService
  ) {}

  /**
   * Initiates sign-in process
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge
   */
  @Mutation(() => SignInResult, {
    name: "signIn",
    description: "Initiates sign-in process by sending OTP to user",
  })
  @Public()
  async signIn(@Args("input") input: SignInInput): Promise<SignInResult> {
    return this.authService.signIn(input);
  }

  /**
   * Confirms sign-in with OTP
   * @param input - Confirmation input with OTP and session
   * @param context - GraphQL context with request
   * @returns Confirmation result with tokens or error
   */
  @Mutation(() => ConfirmSignInResult, {
    name: "confirmSignIn",
    description: "Confirms sign-in by verifying OTP code",
  })
  @Public()
  async confirmSignIn(
    @Args("input") input: ConfirmSignInInput,
    @Context() context: GraphQLContext
  ): Promise<ConfirmSignInResult> {
    return this.authService.confirmSignIn(input, context.req);
  }

  /**
   * Resends OTP code
   * @param input - Resend input with identifier
   * @returns Sign-in result with new challenge
   */
  @Mutation(() => SignInResult, {
    name: "resendOTP",
    description: "Resends OTP code to user",
  })
  @Public()
  async resendOTP(@Args("input") input: ResendOtpInput): Promise<SignInResult> {
    return this.authService.resendOTP(input);
  }

  /**
   * Refreshes authentication tokens
   * @param input - Refresh token input
   * @returns New authentication tokens
   */
  @Mutation(() => AuthenticationResultWithMessage, {
    name: "refreshToken",
    description: "Refreshes authentication tokens using refresh token",
  })
  @Public()
  async refreshToken(
    @Args("input") input: RefreshTokenInput
  ): Promise<AuthenticationResultWithMessage> {
    return this.authService.refreshToken(input);
  }

  /**
   * Signs out user
   * @param accessToken - Access token from Authorization header
   * @param context - GraphQL context with request
   * @returns Success message
   */
  @Mutation(() => Message, {
    name: "signOut",
    description: "Signs out user from current session",
  })
  @Public()
  async signOut(
    @Args("accessToken") accessToken: string,
    @Context() context: GraphQLContext
  ): Promise<Message> {
    return this.authService.signOut(accessToken, context.req);
  }
}
