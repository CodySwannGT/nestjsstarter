/**
 * @file authentication-result.type.ts
 * @description GraphQL object type for authentication result containing tokens
 * @module auth/types
 */
import { Field, Int, ObjectType } from "@nestjs/graphql";

/**
 * Result of successful authentication
 * @description Contains access tokens and session information from Cognito
 */
@ObjectType({ description: "Result of successful authentication" })
export class AuthenticationResult {
  /**
   * JWT access token for API requests
   */
  @Field(() => String, {
    nullable: true,
    description: "JWT access token for API requests",
  })
  accessToken?: string;

  /**
   * Token expiration time in seconds
   */
  @Field(() => Int, {
    nullable: true,
    description: "Token expiration time in seconds",
  })
  expiresIn?: number;

  /**
   * Type of token (typically 'Bearer')
   */
  @Field(() => String, {
    nullable: true,
    description: "Type of token (typically 'Bearer')",
  })
  tokenType?: string;

  /**
   * Refresh token for obtaining new access tokens
   */
  @Field(() => String, {
    nullable: true,
    description: "Refresh token for obtaining new access tokens",
  })
  refreshToken?: string;

  /**
   * JWT ID token containing user claims
   */
  @Field(() => String, {
    nullable: true,
    description: "JWT ID token containing user claims",
  })
  idToken?: string;
}
