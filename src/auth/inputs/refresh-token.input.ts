/**
 * @file refresh-token.input.ts
 * @description GraphQL input type for refreshing authentication tokens
 * @module auth/inputs
 */
import { Field, InputType } from "@nestjs/graphql";

/**
 * Input for refreshing authentication tokens
 * @description Contains the refresh token from a previous authentication
 */
@InputType({ description: "Input for refreshing authentication token" })
export class RefreshTokenInput {
  /**
   * The refresh token from a previous authentication
   */
  @Field(() => String, {
    description: "The refresh token from a previous authentication",
  })
  refreshToken: string;
}
