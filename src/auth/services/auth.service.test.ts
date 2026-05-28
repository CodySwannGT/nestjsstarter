/**
 * @file auth.service.test.ts
 * @description Unit tests for AuthService
 * @module auth/services
 */
import { vi, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthService } from "./auth.service";
import { CognitoService } from "./cognito.service";

const TEST_EMAIL = "test@example.com";
const TEST_SESSION = "test-session";
const TEST_OTP = "123456";
const ACCESS_TOKEN = "access-token";
const ID_TOKEN = "id-token";
const REFRESH_TOKEN = "refresh-token";
const CODE_SENT_MESSAGE = "Code sent";
const IDENTITY_VERIFIED_MESSAGE = "Your identity has been verified";
const TOKEN_REFRESHED_MESSAGE = "Token refreshed";
const SIGN_OUT_MESSAGE = "Sign out successful.";
const CUSTOM_CHALLENGE = "CUSTOM_CHALLENGE";

/**
 * Mock CognitoService factory
 * @description Creates a mock CognitoService for testing
 * @returns Mock CognitoService with vi.fn() implementations
 */
const createMockCognitoService = () => ({
  initiateAuthCustom: vi.fn(),
  respondToAuthChallenge: vi.fn(),
  refreshToken: vi.fn(),
  globalSignOut: vi.fn(),
  createSignInResult: vi.fn(),
  createConfirmSignInResult: vi.fn(),
  handleErrorConfirmSignin: vi.fn(),
});

describe("AuthService", () => {
  let service: AuthService;

  let mockCognitoService: ReturnType<typeof createMockCognitoService>;

  beforeEach(async () => {
    mockCognitoService = createMockCognitoService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CognitoService, useValue: mockCognitoService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("signIn", () => {
    it("should call cognitoService.initiateAuthCustom", async () => {
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: TEST_SESSION,
        ChallengeParameters: { USERNAME: TEST_EMAIL },
      };
      const expectedResult = {
        message: CODE_SENT_MESSAGE,
        data: {
          ChallengeName: CUSTOM_CHALLENGE,
          Session: TEST_SESSION,
          ChallengeParameters: { USERNAME: TEST_EMAIL },
        },
      };

      mockCognitoService.initiateAuthCustom.mockResolvedValue(cognitoResponse);
      mockCognitoService.createSignInResult.mockReturnValue(expectedResult);

      await service.signIn({ identifier: TEST_EMAIL });

      expect(mockCognitoService.initiateAuthCustom).toHaveBeenCalledWith(
        TEST_EMAIL
      );
    });

    it("should return formatted SignInResult", async () => {
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: TEST_SESSION,
        ChallengeParameters: { USERNAME: TEST_EMAIL },
      };
      const expectedResult = {
        message: CODE_SENT_MESSAGE,
        data: {
          ChallengeName: CUSTOM_CHALLENGE,
          Session: TEST_SESSION,
          ChallengeParameters: { USERNAME: TEST_EMAIL },
        },
      };

      mockCognitoService.initiateAuthCustom.mockResolvedValue(cognitoResponse);
      mockCognitoService.createSignInResult.mockReturnValue(expectedResult);

      const result = await service.signIn({ identifier: TEST_EMAIL });

      expect(mockCognitoService.createSignInResult).toHaveBeenCalledWith(
        CODE_SENT_MESSAGE,
        cognitoResponse
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("confirmSignIn", () => {
    it("should return authResult on success", async () => {
      const cognitoResponse = {
        AuthenticationResult: {
          AccessToken: ACCESS_TOKEN,
          IdToken: ID_TOKEN,
          RefreshToken: REFRESH_TOKEN,
          ExpiresIn: 3600,
          TokenType: "Bearer",
        },
      };
      const authResult = {
        message: IDENTITY_VERIFIED_MESSAGE,
        data: {
          accessToken: ACCESS_TOKEN,
          idToken: ID_TOKEN,
          refreshToken: REFRESH_TOKEN,
          expiresIn: 3600,
          tokenType: "Bearer",
        },
      };

      mockCognitoService.respondToAuthChallenge.mockResolvedValue(
        cognitoResponse
      );
      mockCognitoService.createConfirmSignInResult.mockReturnValue(authResult);

      const result = await service.confirmSignIn({
        otpCode: TEST_OTP,
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      });

      expect(result.authResult).toEqual(authResult);
      expect(result.signInResult).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it("should return signInResult on challenge", async () => {
      const attemptsLeft = "2";
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: TEST_SESSION,
        ChallengeParameters: {
          USERNAME: TEST_EMAIL,
          attemptsLeft,
        },
      };
      const signInResult = {
        message: `You have ${attemptsLeft} attempts left`,
        data: {
          ChallengeName: CUSTOM_CHALLENGE,
          Session: TEST_SESSION,
          ChallengeParameters: {
            USERNAME: TEST_EMAIL,
            attemptsLeft,
          },
        },
      };

      mockCognitoService.respondToAuthChallenge.mockResolvedValue(
        cognitoResponse
      );
      mockCognitoService.createSignInResult.mockReturnValue(signInResult);

      const result = await service.confirmSignIn({
        otpCode: "wrong-code",
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      });

      expect(mockCognitoService.createSignInResult).toHaveBeenCalledWith(
        `You have ${attemptsLeft} attempts left`,
        cognitoResponse
      );
      expect(result.signInResult).toEqual(signInResult);
      expect(result.authResult).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it("should return errorMessage on error", async () => {
      const error = new Error("Invalid session for the user.");
      const errorMessage = {
        message: "Your login session has expired. Please log in again.",
      };

      mockCognitoService.respondToAuthChallenge.mockRejectedValue(error);
      mockCognitoService.handleErrorConfirmSignin.mockReturnValue(errorMessage);

      const result = await service.confirmSignIn({
        otpCode: TEST_OTP,
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      });

      expect(mockCognitoService.handleErrorConfirmSignin).toHaveBeenCalledWith(
        error
      );
      expect(result.errorMessage).toEqual(errorMessage);
      expect(result.authResult).toBeUndefined();
      expect(result.signInResult).toBeUndefined();
    });
  });

  describe("refreshToken", () => {
    it("should call cognitoService.refreshToken", async () => {
      const cognitoResponse = {
        AuthenticationResult: {
          AccessToken: "new-access-token",
          IdToken: "new-id-token",
          ExpiresIn: 3600,
          TokenType: "Bearer",
        },
      };
      const expectedResult = {
        message: TOKEN_REFRESHED_MESSAGE,
        data: {
          accessToken: "new-access-token",
          idToken: "new-id-token",
          expiresIn: 3600,
          tokenType: "Bearer",
        },
      };

      mockCognitoService.refreshToken.mockResolvedValue(cognitoResponse);
      mockCognitoService.createConfirmSignInResult.mockReturnValue(
        expectedResult
      );

      const result = await service.refreshToken({
        refreshToken: REFRESH_TOKEN,
      });

      expect(mockCognitoService.refreshToken).toHaveBeenCalledWith(
        REFRESH_TOKEN
      );
      expect(mockCognitoService.createConfirmSignInResult).toHaveBeenCalledWith(
        TOKEN_REFRESHED_MESSAGE,
        cognitoResponse
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("signOut", () => {
    it("should call cognitoService.globalSignOut", async () => {
      mockCognitoService.globalSignOut.mockResolvedValue(undefined);

      const result = await service.signOut(ACCESS_TOKEN);

      expect(mockCognitoService.globalSignOut).toHaveBeenCalledWith(
        ACCESS_TOKEN
      );
      expect(result).toEqual({ message: SIGN_OUT_MESSAGE });
    });
  });

  describe("resendOTP", () => {
    it("should delegate to signIn", async () => {
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: TEST_SESSION,
        ChallengeParameters: { USERNAME: TEST_EMAIL },
      };
      const expectedResult = {
        message: CODE_SENT_MESSAGE,
        data: {
          ChallengeName: CUSTOM_CHALLENGE,
          Session: TEST_SESSION,
          ChallengeParameters: { USERNAME: TEST_EMAIL },
        },
      };

      mockCognitoService.initiateAuthCustom.mockResolvedValue(cognitoResponse);
      mockCognitoService.createSignInResult.mockReturnValue(expectedResult);

      const result = await service.resendOTP({ identifier: TEST_EMAIL });

      expect(mockCognitoService.initiateAuthCustom).toHaveBeenCalledWith(
        TEST_EMAIL
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
