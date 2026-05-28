/**
 * @file challenge-parameters-result.type.ts
 * @description GraphQL object type for authentication challenge parameters
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

/**
 * Parameters returned with authentication challenge
 * @description Contains session info, attempt tracking, and user details from Cognito
 */
@ObjectType({
  description: "Parameters returned with authentication challenge",
})
export class ChallengeParametersResult {
  /**
   * Username associated with the challenge
   */
  @Field(() => String, {
    nullable: true,
    description: "Username associated with the challenge",
  })
  USERNAME?: string;

  /**
   * Number of attempts made
   */
  @Field(() => String, {
    nullable: true,
    description: "Number of attempts made",
  })
  attempts?: string;

  /**
   * Number of attempts remaining
   */
  @Field(() => String, {
    nullable: true,
    description: "Number of attempts remaining",
  })
  attemptsLeft?: string;

  /**
   * Email address associated with the challenge
   */
  @Field(() => String, {
    nullable: true,
    description: "Email address associated with the challenge",
  })
  email?: string;

  /**
   * Maximum number of attempts allowed
   */
  @Field(() => String, {
    nullable: true,
    description: "Maximum number of attempts allowed",
  })
  maxAttempts?: string;
}
