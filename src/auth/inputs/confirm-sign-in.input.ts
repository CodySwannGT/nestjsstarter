/**
 * @file confirm-sign-in.input.ts
 * @description GraphQL input type for confirming sign-in with OTP
 * @module auth/inputs
 */
import { Field, InputType } from "@nestjs/graphql";

/**
 * Input for confirming sign-in with OTP code
 * @description Contains the OTP code, identifier, and session token
 */
@InputType({ description: "Input for confirming sign-in with OTP" })
export class ConfirmSignInInput {
  /**
   * The OTP code sent to the user
   */
  @Field(() => String, { description: "The OTP code sent to the user" })
  otpCode: string;

  /**
   * The identifier used during sign-in (email or phone number)
   */
  @Field(() => String, {
    description: "The identifier used during sign-in (email or phone number)",
  })
  identifier: string;

  /**
   * The session token from the sign-in request
   */
  @Field(() => String, {
    description: "The session token from the sign-in request",
  })
  session: string;
}
