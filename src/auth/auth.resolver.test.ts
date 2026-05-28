/**
 * @file auth.resolver.test.ts
 * @description Unit tests for AuthResolver
 * @module auth
 */
import { vi, expect, Mocked } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";

import { AuthResolver } from "./auth.resolver";
import { ConfirmSignInInput } from "./inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "./inputs/refresh-token.input";
import { ResendOtpInput } from "./inputs/resend-otp.input";
import { SignInInput } from "./inputs/sign-in.input";
import { IAuthService } from "./interfaces/auth-service.interface";
import { AUTH_SERVICE } from "./providers/auth-service.provider";
import { AuthenticationResultWithMessage } from "./types/authentication-result-with-message.type";
import { ConfirmSignInResult } from "./types/confirm-sign-in-result.type";
import { Message } from "./types/message.type";
import { SignInResult } from "./types/sign-in-result.type";

/**
 * Test context interface for AuthResolver tests
 */
interface TestContext {
  readonly resolver: AuthResolver;
  readonly mockAuthService: Mocked<IAuthService>;
}

/**
 * Creates a mock auth service for testing
 * @returns Mocked IAuthService implementation
 */
function createMockAuthService(): Mocked<IAuthService> {
  return {
    signIn: vi.fn(),
    confirmSignIn: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn(),
    resendOTP: vi.fn(),
  };
}

/**
 * Creates a mock Express request
 * @returns Partial mock Request object
 */
function createMockRequest(): Partial<Request> {
  return {
    headers: {},
    ip: "127.0.0.1",
  };
}

/** Test constants for reusable test data */
const TEST_EMAIL = "test@example.com";
const TEST_SESSION = "session-token";
const TEST_CHALLENGE = "CUSTOM_CHALLENGE";

describe("AuthResolver", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    const mockAuthService = createMockAuthService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AUTH_SERVICE,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    (ctx as { resolver: AuthResolver }).resolver =
      module.get<AuthResolver>(AuthResolver);
    (ctx as { mockAuthService: Mocked<IAuthService> }).mockAuthService =
      mockAuthService;
  });

  describe("AuthResolver", () => {
    it("should be defined", () => {
      expect(ctx.resolver).toBeDefined();
    });
  });

  describe("signIn", () => {
    it("should delegate to authService.signIn", async () => {
      const input: SignInInput = { identifier: TEST_EMAIL };
      const expectedResult: SignInResult = {
        message: "OTP sent",
        data: {
          ChallengeName: TEST_CHALLENGE,
          Session: TEST_SESSION,
          ChallengeParameters: {
            USERNAME: TEST_EMAIL,
          },
        },
      };

      ctx.mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await ctx.resolver.signIn(input);

      expect(ctx.mockAuthService.signIn).toHaveBeenCalledWith(input);
      expect(ctx.mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("confirmSignIn", () => {
    it("should delegate to authService.confirmSignIn", async () => {
      const input: ConfirmSignInInput = {
        otpCode: "123456",
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      };
      const mockRequest = createMockRequest() as Request;
      const expectedResult: ConfirmSignInResult = {
        authResult: {
          message: "Sign-in successful",
          data: {
            accessToken: "access-token",
            idToken: "id-token",
            refreshToken: "refresh-token",
            expiresIn: 3600,
            tokenType: "Bearer",
          },
        },
      };

      ctx.mockAuthService.confirmSignIn.mockResolvedValue(expectedResult);

      const result = await ctx.resolver.confirmSignIn(input, {
        req: mockRequest,
      });

      expect(ctx.mockAuthService.confirmSignIn).toHaveBeenCalledWith(
        input,
        mockRequest
      );
      expect(ctx.mockAuthService.confirmSignIn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it("should pass context.req to service", async () => {
      const input: ConfirmSignInInput = {
        otpCode: "123456",
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      };
      const mockRequest = createMockRequest() as Request;
      const expectedResult: ConfirmSignInResult = {};

      ctx.mockAuthService.confirmSignIn.mockResolvedValue(expectedResult);

      await ctx.resolver.confirmSignIn(input, { req: mockRequest });

      const [, passedRequest] = ctx.mockAuthService.confirmSignIn.mock.calls[0];
      expect(passedRequest).toBe(mockRequest);
    });
  });

  describe("resendOTP", () => {
    it("should delegate to authService.resendOTP", async () => {
      const input: ResendOtpInput = { identifier: TEST_EMAIL };
      const expectedResult: SignInResult = {
        message: "OTP resent",
        data: {
          ChallengeName: TEST_CHALLENGE,
          Session: "new-session-token",
          ChallengeParameters: {
            USERNAME: TEST_EMAIL,
          },
        },
      };

      ctx.mockAuthService.resendOTP.mockResolvedValue(expectedResult);

      const result = await ctx.resolver.resendOTP(input);

      expect(ctx.mockAuthService.resendOTP).toHaveBeenCalledWith(input);
      expect(ctx.mockAuthService.resendOTP).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("refreshToken", () => {
    it("should delegate to authService.refreshToken", async () => {
      const input: RefreshTokenInput = { refreshToken: "refresh-token" };
      const expectedResult: AuthenticationResultWithMessage = {
        message: "Token refreshed",
        data: {
          accessToken: "new-access-token",
          idToken: "new-id-token",
          expiresIn: 3600,
          tokenType: "Bearer",
        },
      };

      ctx.mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await ctx.resolver.refreshToken(input);

      expect(ctx.mockAuthService.refreshToken).toHaveBeenCalledWith(input);
      expect(ctx.mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("signOut", () => {
    it("should delegate to authService.signOut", async () => {
      const accessToken = "access-token";
      const mockRequest = createMockRequest() as Request;
      const expectedResult: Message = { message: "Signed out successfully" };

      ctx.mockAuthService.signOut.mockResolvedValue(expectedResult);

      const result = await ctx.resolver.signOut(accessToken, {
        req: mockRequest,
      });

      expect(ctx.mockAuthService.signOut).toHaveBeenCalledWith(
        accessToken,
        mockRequest
      );
      expect(ctx.mockAuthService.signOut).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
