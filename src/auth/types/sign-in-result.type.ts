/**
 * @file sign-in-result.type.ts
 * @description GraphQL object type for sign-in result
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

import { ChallengeResult } from "./challenge-result.type";

/**
 * Result of sign-in initiation
 * @description Contains message and challenge data for completing authentication
 */
@ObjectType({ description: "Result of sign-in initiation" })
export class SignInResult {
  /**
   * Status message about the sign-in process
   */
  @Field(() => String, {
    description: "Status message about the sign-in process",
  })
  message: string;

  /**
   * Challenge data requiring user response
   */
  @Field(() => ChallengeResult, {
    description: "Challenge data requiring user response",
  })
  data: ChallengeResult;
}
