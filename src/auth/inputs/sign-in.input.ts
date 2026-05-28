/**
 * @file sign-in.input.ts
 * @description GraphQL input type for initiating the sign-in process
 * @module auth/inputs
 */
import { Field, InputType } from "@nestjs/graphql";

/**
 * Input for initiating the sign-in process
 * @description Contains the identifier (email or phone) used to authenticate
 */
@InputType({ description: "Input for initiating sign-in process" })
export class SignInInput {
  /**
   * The identifier used to sign in (email or phone number)
   */
  @Field(() => String, {
    description: "The identifier used to sign in (email or phone number)",
  })
  identifier: string;
}
