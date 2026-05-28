/**
 * @file index.test.ts
 * @description Unit tests for barrel exports of authentication input types
 * @module auth/inputs
 */
import { expect } from "vitest";
import "reflect-metadata";

import {
  ConfirmSignInInput,
  RefreshTokenInput,
  ResendOtpInput,
  SignInInput,
} from "./index";

describe("auth/inputs barrel exports", () => {
  it("should export ConfirmSignInInput", () => {
    expect(ConfirmSignInInput).toBeDefined();
    expect(new ConfirmSignInInput()).toBeInstanceOf(ConfirmSignInInput);
  });

  it("should export RefreshTokenInput", () => {
    expect(RefreshTokenInput).toBeDefined();
    expect(new RefreshTokenInput()).toBeInstanceOf(RefreshTokenInput);
  });

  it("should export ResendOtpInput", () => {
    expect(ResendOtpInput).toBeDefined();
    expect(new ResendOtpInput()).toBeInstanceOf(ResendOtpInput);
  });

  it("should export SignInInput", () => {
    expect(SignInInput).toBeDefined();
    expect(new SignInInput()).toBeInstanceOf(SignInInput);
  });
});
