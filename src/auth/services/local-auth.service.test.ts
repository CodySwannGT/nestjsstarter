/**
 * @file local-auth.service.test.ts
 * @description Unit tests for LocalAuthService
 * @module auth/services
 */
/* eslint-disable max-lines -- Comprehensive test coverage requires extensive test cases for auth flow */
import { expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";

import { LocalAuthService } from "./local-auth.service";

const TEST_EMAIL = "test@example.com";
const TEST_PHONE = "+15551234567";
const MAGIC_OTP = "000000";
const WRONG_OTP = "111111";
const ATTEMPTS_LEFT_AFTER_ONE_FAILURE = "2";
const ERROR_INVALID_SESSION = "Invalid or expired";

/**
 * Extracts session from sign-in result with type assertion
 * @param session - Optional session string from sign-in result
 * @returns Session string
 * @throws Error if session is undefined
 */
function getSession(session: string | undefined): string {
  if (!session) {
    throw new Error("Session is undefined");
  }
  return session;
}

describe("LocalAuthService", () => {
  let service: LocalAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalAuthService],
    }).compile();

    service = module.get<LocalAuthService>(LocalAuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("signIn", () => {
    it("should return SignInResult with session", async () => {
      const result = await service.signIn({ identifier: TEST_EMAIL });

      expect(result).toBeDefined();
      expect(result.message).toBe("Code sent");
      expect(result.data).toBeDefined();
      expect(result.data.Session).toBeDefined();
      expect(result.data.Session).toMatch(/^local-session-\d+-[a-z0-9]+$/);
    });

    it("should create unique session IDs", async () => {
      const result1 = await service.signIn({ identifier: TEST_EMAIL });
      const result2 = await service.signIn({ identifier: TEST_EMAIL });

      expect(result1.data.Session).not.toBe(result2.data.Session);
    });

    it("should include identifier in challenge parameters", async () => {
      const result = await service.signIn({ identifier: TEST_EMAIL });

      expect(result.data.ChallengeParameters?.USERNAME).toBe(TEST_EMAIL);
    });

    it("should set maxAttempts to 3", async () => {
      const result = await service.signIn({ identifier: TEST_EMAIL });

      expect(result.data.ChallengeParameters?.maxAttempts).toBe("3");
      expect(result.data.ChallengeParameters?.attemptsLeft).toBe("3");
    });

    it("should return CUSTOM_CHALLENGE as ChallengeName", async () => {
      const result = await service.signIn({ identifier: TEST_EMAIL });

      expect(result.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
    });
  });

  describe("confirmSignIn", () => {
    it("should succeed with magic OTP 000000", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      const result = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(result.authResult).toBeDefined();
      expect(result.errorMessage).toBeUndefined();
      expect(result.signInResult).toBeUndefined();
    });

    it("should return tokens on success", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      const result = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(result.authResult?.data?.accessToken).toBeDefined();
      expect(result.authResult?.data?.idToken).toBeDefined();
      expect(result.authResult?.data?.refreshToken).toBeDefined();
      expect(result.authResult?.data?.expiresIn).toBe(3600);
      expect(result.authResult?.data?.tokenType).toBe("Bearer");
      expect(result.authResult?.message).toBe(
        "Your identity has been verified"
      );
    });

    it("should delete session on success", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      // Second attempt with same session should fail
      const secondResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(secondResult.errorMessage).toBeDefined();
      expect(secondResult.errorMessage?.message).toContain(
        ERROR_INVALID_SESSION
      );
    });

    it("should fail with wrong OTP", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      const result = await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(result.signInResult).toBeDefined();
      expect(result.authResult).toBeUndefined();
      expect(result.signInResult?.data?.ChallengeParameters?.attemptsLeft).toBe(
        ATTEMPTS_LEFT_AFTER_ONE_FAILURE
      );
    });

    it("should track attempt count", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      // First wrong attempt
      const result1 = await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });
      expect(result1.signInResult?.data?.ChallengeParameters?.attempts).toBe(
        "1"
      );
      expect(
        result1.signInResult?.data?.ChallengeParameters?.attemptsLeft
      ).toBe(ATTEMPTS_LEFT_AFTER_ONE_FAILURE);

      // Second wrong attempt
      const result2 = await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });
      expect(result2.signInResult?.data?.ChallengeParameters?.attempts).toBe(
        ATTEMPTS_LEFT_AFTER_ONE_FAILURE
      );
      expect(
        result2.signInResult?.data?.ChallengeParameters?.attemptsLeft
      ).toBe("1");
    });

    it("should return error for invalid session", async () => {
      const result = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session: "invalid-session-123",
      });

      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage?.message).toContain(ERROR_INVALID_SESSION);
    });

    it("should return error for mismatched identifier", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      const result = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: "different@example.com",
        session,
      });

      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage?.message).toContain("does not match");
    });

    it("should invalidate session after 3 failed attempts", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);

      // Three wrong attempts
      await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });
      await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });
      const thirdResult = await service.confirmSignIn({
        otpCode: WRONG_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(thirdResult.errorMessage).toBeDefined();
      expect(thirdResult.errorMessage?.message).toContain("Maximum attempts");

      // Fourth attempt should show session is invalid
      const fourthResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      expect(fourthResult.errorMessage?.message).toContain(
        ERROR_INVALID_SESSION
      );
    });

    it("should generate deterministic user ID", async () => {
      // First sign-in flow
      const signInResult1 = await service.signIn({ identifier: TEST_EMAIL });
      const result1 = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session: getSession(signInResult1.data.Session),
      });

      // Second sign-in flow with same identifier
      const signInResult2 = await service.signIn({ identifier: TEST_EMAIL });
      const result2 = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session: getSession(signInResult2.data.Session),
      });

      // Extract userId from tokens (they should contain the same userId)
      const token1 = result1.authResult?.data?.accessToken ?? "";
      const token2 = result2.authResult?.data?.accessToken ?? "";

      // Parse tokens to extract userId
      const payload1 = JSON.parse(
        Buffer.from(token1.split(".")[1], "base64").toString()
      );
      const payload2 = JSON.parse(
        Buffer.from(token2.split(".")[1], "base64").toString()
      );

      expect(payload1["custom:realUserId"]).toBe(payload2["custom:realUserId"]);

      // Different identifier should produce different userId
      const signInResult3 = await service.signIn({ identifier: TEST_PHONE });
      const result3 = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_PHONE,
        session: getSession(signInResult3.data.Session),
      });

      const token3 = result3.authResult?.data?.accessToken ?? "";
      const payload3 = JSON.parse(
        Buffer.from(token3.split(".")[1], "base64").toString()
      );

      expect(payload1["custom:realUserId"]).not.toBe(
        payload3["custom:realUserId"]
      );
    });
  });

  describe("refreshToken", () => {
    it("should return new tokens for valid refresh token", async () => {
      // First sign in to get tokens
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);
      const confirmResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      const originalRefreshToken =
        confirmResult.authResult?.data?.refreshToken ?? "";

      const result = await service.refreshToken({
        refreshToken: originalRefreshToken,
      });

      expect(result).toBeDefined();
      expect(result.message).toBe("Token refreshed");
      expect(result.data).toBeDefined();
    });

    it("should include new access token", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);
      const confirmResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      const originalRefreshToken =
        confirmResult.authResult?.data?.refreshToken ?? "";

      const result = await service.refreshToken({
        refreshToken: originalRefreshToken,
      });

      expect(result.data?.accessToken).toBeDefined();
      // Verify it's a valid JWT structure with access token_use
      const accessPayload = JSON.parse(
        Buffer.from(
          (result.data?.accessToken ?? "").split(".")[1],
          "base64"
        ).toString()
      );
      expect(accessPayload.token_use).toBe("access");
      expect(accessPayload["custom:realUserId"]).toBeDefined();
    });

    it("should include new id token", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);
      const confirmResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      const originalRefreshToken =
        confirmResult.authResult?.data?.refreshToken ?? "";

      const result = await service.refreshToken({
        refreshToken: originalRefreshToken,
      });

      expect(result.data?.idToken).toBeDefined();
      // Verify it's a valid JWT structure with id token_use
      const idPayload = JSON.parse(
        Buffer.from(
          (result.data?.idToken ?? "").split(".")[1],
          "base64"
        ).toString()
      );
      expect(idPayload.token_use).toBe("id");
      expect(idPayload["custom:realUserId"]).toBeDefined();
    });

    it("should return same refresh token", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);
      const confirmResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      const originalRefreshToken =
        confirmResult.authResult?.data?.refreshToken ?? "";

      const result = await service.refreshToken({
        refreshToken: originalRefreshToken,
      });

      expect(result.data?.refreshToken).toBe(originalRefreshToken);
    });

    it("should return error message for invalid token", async () => {
      const result = await service.refreshToken({
        refreshToken: "invalid-token",
      });

      expect(result.data).toBeUndefined();
      expect(result.message).toBe(
        "Invalid refresh token. Please sign in again."
      );
    });

    it("should return error message for expired token", async () => {
      // Create an expired token manually
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: "local-sub-test",
        iat: now - 7200,
        exp: now - 3600, // Expired 1 hour ago
        token_use: "refresh",
        "custom:realUserId": "local-user-test",
      };
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const payload = Buffer.from(JSON.stringify(expiredPayload))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const expiredToken = `${header}.${payload}.local-dev`;

      const result = await service.refreshToken({ refreshToken: expiredToken });

      expect(result.data).toBeUndefined();
      expect(result.message).toBe(
        "Refresh token has expired. Please sign in again."
      );
    });

    it("should return error message for non-refresh token type", async () => {
      const signInResult = await service.signIn({ identifier: TEST_EMAIL });
      const session = getSession(signInResult.data.Session);
      const confirmResult = await service.confirmSignIn({
        otpCode: MAGIC_OTP,
        identifier: TEST_EMAIL,
        session,
      });

      // Use access token instead of refresh token
      const accessToken = confirmResult.authResult?.data?.accessToken ?? "";

      const result = await service.refreshToken({ refreshToken: accessToken });

      expect(result.data).toBeUndefined();
      expect(result.message).toBe(
        "Invalid token type. Expected refresh token."
      );
    });
  });

  describe("signOut", () => {
    it("should return success message", async () => {
      const result = await service.signOut("some-access-token");

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should return "Sign out successful." message', async () => {
      const result = await service.signOut("some-access-token");

      expect(result.message).toBe("Sign out successful.");
    });
  });

  describe("resendOTP", () => {
    it("should return SignInResult with new session", async () => {
      const result = await service.resendOTP({ identifier: TEST_EMAIL });

      expect(result).toBeDefined();
      expect(result.message).toBe("Code sent");
      expect(result.data).toBeDefined();
      expect(result.data.Session).toBeDefined();
      expect(result.data.Session).toMatch(/^local-session-\d+-[a-z0-9]+$/);
      expect(result.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
      expect(result.data.ChallengeParameters?.USERNAME).toBe(TEST_EMAIL);
    });

    it("should create new session ID different from previous", async () => {
      const firstResult = await service.resendOTP({ identifier: TEST_EMAIL });
      const secondResult = await service.resendOTP({ identifier: TEST_EMAIL });

      expect(firstResult.data.Session).not.toBe(secondResult.data.Session);
    });
  });

  it("should implement IAuthService interface", () => {
    // Type check - LocalAuthService should have all IAuthService methods
    expect(typeof service.signIn).toBe("function");
    expect(typeof service.confirmSignIn).toBe("function");
    expect(typeof service.refreshToken).toBe("function");
    expect(typeof service.signOut).toBe("function");
    expect(typeof service.resendOTP).toBe("function");
  });
});
/* eslint-enable max-lines -- Comprehensive test coverage requires extensive test cases for auth flow */
