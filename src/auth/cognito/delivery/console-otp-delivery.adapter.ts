/**
 * @file console-otp-delivery.adapter.ts
 * @description Default, offline-safe OTP delivery adapter that logs the code
 * @module auth/cognito/delivery
 * @remarks
 * This adapter performs no network or AWS calls — it simply logs the code at
 * debug level. It is the safe default so local boot and credential-free
 * `sls offline start` never depend on a real transport. Production deploys
 * replace it with an SES/SMS-backed adapter implementing {@link OtpDeliveryPort}.
 */

import { Logger } from "@nestjs/common";

import type { OtpDeliveryPort } from "./otp-delivery.port";

/**
 * OTP delivery adapter that logs the code instead of sending it.
 * @remarks Intended for local development and tests only.
 */
export class ConsoleOtpDeliveryAdapter implements OtpDeliveryPort {
  private readonly logger = new Logger(ConsoleOtpDeliveryAdapter.name);

  /**
   * Logs the OTP code at debug level rather than sending it anywhere.
   * @param destination - Opaque delivery address (e.g. phone number or email)
   * @param code - The one-time-password code to deliver
   * @returns Resolves immediately after logging
   */
  async deliver(destination: string, code: string): Promise<void> {
    this.logger.debug(`OTP for ${destination}: ${code}`);
  }
}

/**
 * Shared default delivery instance used by the CreateAuthChallenge trigger.
 * @remarks Offline-safe; swap for a real transport at deploy time.
 */
export const defaultOtpDelivery: OtpDeliveryPort =
  new ConsoleOtpDeliveryAdapter();
