/**
 * @file console-otp-delivery.adapter.test.ts
 * @description Unit tests for the offline-safe console OTP delivery adapter
 * @module auth/cognito/delivery
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { Logger } from "@nestjs/common";

import {
  ConsoleOtpDeliveryAdapter,
  defaultOtpDelivery,
} from "./console-otp-delivery.adapter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConsoleOtpDeliveryAdapter", () => {
  it("logs the OTP code at debug level without throwing", async () => {
    const debugSpy = vi
      .spyOn(Logger.prototype, "debug")
      .mockImplementation(() => {});
    const adapter = new ConsoleOtpDeliveryAdapter();

    await expect(
      adapter.deliver("+15551234567", "123456")
    ).resolves.toBeUndefined();
    expect(debugSpy).toHaveBeenCalledWith("OTP for +15551234567: 123456");
  });

  it("exposes a shared default instance", () => {
    expect(defaultOtpDelivery).toBeInstanceOf(ConsoleOtpDeliveryAdapter);
  });
});
