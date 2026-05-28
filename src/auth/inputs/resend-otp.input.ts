/**
 * @file resend-otp.input.ts
 * @description GraphQL input type for resending OTP codes
 * @module auth/inputs
 */
import { Field, InputType } from "@nestjs/graphql";

/**
 * Input for resending OTP code
 * @description Contains the identifier to send the OTP to
 */
@InputType({ description: "Input for resending OTP code" })
export class ResendOtpInput {
  /**
   * The identifier to send the OTP to (email or phone number)
   */
  @Field(() => String, {
    description: "The identifier to send the OTP to (email or phone number)",
  })
  identifier: string;
}
