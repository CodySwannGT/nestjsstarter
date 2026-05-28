/**
 * @file authentication-result-with-message.type.ts
 * @description GraphQL object type for authentication result with status message
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

import { AuthenticationResult } from "./authentication-result.type";

/**
 * Authentication result with status message
 * @description Wraps authentication result with a user-friendly message
 */
@ObjectType({ description: "Authentication result with status message" })
export class AuthenticationResultWithMessage {
  /**
   * The authentication result data
   */
  @Field(() => AuthenticationResult, {
    nullable: true,
    description: "The authentication result data",
  })
  data?: AuthenticationResult;

  /**
   * User-friendly status message
   */
  @Field(() => String, {
    nullable: true,
    description: "User-friendly status message",
  })
  message?: string;
}
