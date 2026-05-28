/**
 * @file auth.integration.test.ts
 * @description Integration tests for local authentication flow
 * @module auth
 */

import { expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Request } from "express";

import { AuthModule } from "./auth.module";
import { AuthResolver } from "./auth.resolver";
import { AUTH_SERVICE } from "./providers/auth-service.provider";
import { IAuthService } from "./interfaces/auth-service.interface";
import { LocalAuthService } from "./services/local-auth.service";

/**
 * Mock GraphQL context for testing
 * @description Provides Express request for resolver methods
 */
interface MockGraphQLContext {
  readonly req: Request;
}

describe("Local Auth Flow Integration", () => {
  const originalEnv = process.env.IS_OFFLINE;
  const testIdentifier = "+15551234567";
  const magicOtp = "000000";

  let module: TestingModule;

  let resolver: AuthResolver;

  let authService: IAuthService;

  beforeAll(async () => {
    process.env.IS_OFFLINE = "true";

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ IS_OFFLINE: "true", AWS_REGION: "us-east-1" })],
        }),
        AuthModule,
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<IAuthService>(AUTH_SERVICE);
  });

  afterAll(async () => {
    process.env.IS_OFFLINE = originalEnv;
    await module?.close();
  });

  describe("Service Selection", () => {
    it("should inject LocalAuthService when IS_OFFLINE=true", () => {
      expect(authService).toBeInstanceOf(LocalAuthService);
    });
  });

  describe("Sign-In Flow", () => {
    it("should return challenge with session on sign-in", async () => {
      const result = await resolver.signIn({ identifier: testIdentifier });

      expect(result.message).toBe("Code sent");
      expect(result.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
      expect(result.data.Session).toBeDefined();
      expect(result.data.Session).toMatch(/^local-session-/);
    });
  });

  describe("Confirm Sign-In Flow", () => {
    it("should succeed with magic OTP 000000", async () => {
      // Sign in first
      const signInResult = await resolver.signIn({
        identifier: testIdentifier,
      });
      const session = signInResult.data.Session as string;

      // Confirm with magic OTP
      const mockContext = { req: {} as Request } as MockGraphQLContext;
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session,
          otpCode: magicOtp,
        },
        mockContext
      );

      expect(confirmResult.errorMessage).toBeUndefined();
      expect(confirmResult.authResult).toBeDefined();
      expect(confirmResult.authResult?.data?.accessToken).toBeDefined();
      expect(confirmResult.authResult?.data?.refreshToken).toBeDefined();
      expect(confirmResult.authResult?.data?.idToken).toBeDefined();
    });

    it("should fail with incorrect OTP and show attempts remaining", async () => {
      const signInResult = await resolver.signIn({
        identifier: testIdentifier,
      });
      const session = signInResult.data.Session as string;

      const mockContext = { req: {} as Request } as MockGraphQLContext;
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session,
          otpCode: "123456", // Wrong code
        },
        mockContext
      );

      expect(confirmResult.authResult).toBeUndefined();
      expect(confirmResult.signInResult).toBeDefined();
      expect(confirmResult.signInResult?.message).toContain("attempts left");
    });

    it("should fail with invalid session", async () => {
      const mockContext = { req: {} as Request } as MockGraphQLContext;
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session: "invalid-session-id",
          otpCode: magicOtp,
        },
        mockContext
      );

      expect(confirmResult.errorMessage).toBeDefined();
      expect(confirmResult.errorMessage?.message).toContain("Invalid");
    });
  });

  describe("Token Refresh Flow", () => {
    it("should refresh tokens with valid refresh token", async () => {
      // Complete sign-in first
      const signInResult = await resolver.signIn({
        identifier: testIdentifier,
      });
      const mockContext = { req: {} as Request } as MockGraphQLContext;
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session: signInResult.data.Session as string,
          otpCode: magicOtp,
        },
        mockContext
      );

      const refreshToken = confirmResult.authResult?.data
        ?.refreshToken as string;

      // Refresh tokens
      const refreshResult = await resolver.refreshToken({ refreshToken });

      expect(refreshResult.message).toBe("Token refreshed");
      expect(refreshResult.data?.accessToken).toBeDefined();
      expect(refreshResult.data?.idToken).toBeDefined();
    });
  });

  describe("Sign-Out Flow", () => {
    it("should return success message on sign-out", async () => {
      const mockContext = { req: {} as Request } as MockGraphQLContext;
      const result = await resolver.signOut("any-token", mockContext);

      expect(result.message).toBe("Sign out successful.");
    });
  });

  describe("Resend OTP Flow", () => {
    it("should return new session on resend OTP", async () => {
      const result = await resolver.resendOTP({ identifier: testIdentifier });

      expect(result.message).toBe("Code sent");
      expect(result.data.Session).toBeDefined();
    });
  });
});
