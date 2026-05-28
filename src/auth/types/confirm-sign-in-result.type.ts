/**
 * @file confirm-sign-in-result.type.ts
 * @description GraphQL object type for confirm sign-in result
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

import { AuthenticationResultWithMessage } from "./authentication-result-with-message.type";
import { Message } from "./message.type";
import { SignInResult } from "./sign-in-result.type";

/**
 * Result of confirm sign-in operation
 * @description Contains either error message, authentication result, or additional challenge requirement
 */
@ObjectType({ description: "Result of confirm sign-in operation" })
export class ConfirmSignInResult {
  /**
   * Error message if sign-in confirmation failed
   */
  @Field(() => Message, {
    nullable: true,
    description: "Error message if sign-in confirmation failed",
  })
  errorMessage?: Message;

  /**
   * Authentication result if sign-in was successful
   */
  @Field(() => AuthenticationResultWithMessage, {
    nullable: true,
    description: "Authentication result if sign-in was successful",
  })
  authResult?: AuthenticationResultWithMessage;

  /**
   * Additional challenge required for sign-in
   */
  @Field(() => SignInResult, {
    nullable: true,
    description: "Additional challenge required for sign-in",
  })
  signInResult?: SignInResult;
}
