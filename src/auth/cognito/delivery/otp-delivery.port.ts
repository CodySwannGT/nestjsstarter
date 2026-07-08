/**
 * @file otp-delivery.port.ts
 * @description Delivery-port abstraction for one-time-password (OTP) codes
 * @module auth/cognito/delivery
 * @remarks
 * The Cognito custom-auth (passwordless OTP) flow generates a code in the
 * CreateAuthChallenge trigger and must deliver it to the user out-of-band.
 * This port decouples the trigger from any concrete transport (SMS, email,
 * push) so the deployed environment can swap in an SES/SMS adapter without
 * touching handler logic. The destination is an opaque string so the same
 * port serves both phone numbers and email addresses.
 */

/**
 * Transport-agnostic contract for delivering an OTP code to a destination.
 */
export interface OtpDeliveryPort {
  /**
   * Delivers an OTP code to the given destination.
   * @param destination - Opaque delivery address (e.g. phone number or email)
   * @param code - The one-time-password code to deliver
   * @returns Resolves once the code has been handed to the transport
   */
  deliver(destination: string, code: string): Promise<void>;
}
