/**
 * @file challenge-result.type.ts
 * @description GraphQL object type for authentication challenge result
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

import { ChallengeParametersResult } from "./challenge-parameters-result.type";

/**
 * Result of authentication challenge
 * @description Contains challenge name, session token, and parameters from Cognito
 */
@ObjectType({ description: "Result of authentication challenge" })
export class ChallengeResult {
  /**
   * Name of the challenge type (e.g., CUSTOM_CHALLENGE)
   */
  @Field(() => String, {
    nullable: true,
    description: "Name of the challenge type",
  })
  ChallengeName?: string;

  /**
   * Session token for the challenge
   */
  @Field(() => String, {
    nullable: true,
    description: "Session token for the challenge",
  })
  Session?: string;

  /**
   * Parameters associated with the challenge
   */
  @Field(() => ChallengeParametersResult, {
    nullable: true,
    description: "Parameters associated with the challenge",
  })
  ChallengeParameters?: ChallengeParametersResult;
}
