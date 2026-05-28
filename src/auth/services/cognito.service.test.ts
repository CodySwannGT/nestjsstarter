/**
 * @file cognito.service.test.ts
 * @description Unit tests for CognitoService
 * @module auth/services
 */
import { vi, expect, type Mock } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoService } from "./cognito.service";

const TEST_EMAIL = "test@example.com";
const TEST_CLIENT_ID = "test-client-id";
const TEST_SESSION = "test-session";
const CUSTOM_CHALLENGE = "CUSTOM_CHALLENGE";
const CODE_SENT_MESSAGE = "Code sent";
const ACCESS_TOKEN = "access-token";
const ID_TOKEN = "id-token";
const REFRESH_TOKEN = "refresh-token";
const SESSION_TOKEN = "session-token";

/**
 * Mock Cognito client module
 * @description Mocks AWS SDK Cognito client for testing
 */
vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  const mockSend = vi.fn();
  return {
    CognitoIdentityProviderClient: vi.fn().mockImplementation(function () {
      return { send: mockSend };
    }),
    InitiateAuthCommand: vi.fn().mockImplementation(function (input) {
      return { input, type: "InitiateAuthCommand" };
    }),
    RespondToAuthChallengeCommand: vi.fn().mockImplementation(function (input) {
      return { input, type: "RespondToAuthChallengeCommand" };
    }),
    AdminInitiateAuthCommand: vi.fn().mockImplementation(function (input) {
      return { input, type: "AdminInitiateAuthCommand" };
    }),
    GlobalSignOutCommand: vi.fn().mockImplementation(function (input) {
      return { input, type: "GlobalSignOutCommand" };
    }),
    AuthFlowType: {
      CUSTOM_AUTH: "CUSTOM_AUTH",
      REFRESH_TOKEN_AUTH: "REFRESH_TOKEN_AUTH",
    },
    ChallengeNameType: {
      CUSTOM_CHALLENGE: "CUSTOM_CHALLENGE",
    },
  };
});

const mockConfigService = {
  get: vi.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      AWS_REGION: "us-east-1",
      COGNITO_USER_POOL_ID: "us-east-1_testpool",
      COGNITO_CLIENT_ID: TEST_CLIENT_ID,
    };
    return config[key] ?? defaultValue;
  }),
};

describe("CognitoService", () => {
  let service: CognitoService;

  let mockSend: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CognitoService>(CognitoService);

    // Get the mock send function from the mocked client
    const MockedClient = vi.mocked(CognitoIdentityProviderClient);
    mockSend = MockedClient.mock.results[0].value.send;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("initiateAuthCustom", () => {
    it("should call InitiateAuthCommand with correct parameters", async () => {
      const mockResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: TEST_SESSION,
        ChallengeParameters: { USERNAME: TEST_EMAIL },
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await service.initiateAuthCustom(TEST_EMAIL);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.type).toBe("InitiateAuthCommand");
      expect(command.input.ClientId).toBe(TEST_CLIENT_ID);
      expect(command.input.AuthFlow).toBe("CUSTOM_AUTH");
      expect(command.input.AuthParameters.USERNAME).toBe(TEST_EMAIL);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("respondToAuthChallenge", () => {
    it("should call RespondToAuthChallengeCommand with correct parameters", async () => {
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: ACCESS_TOKEN,
          IdToken: ID_TOKEN,
          RefreshToken: REFRESH_TOKEN,
        },
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await service.respondToAuthChallenge({
        otpCode: "123456",
        identifier: TEST_EMAIL,
        session: TEST_SESSION,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.type).toBe("RespondToAuthChallengeCommand");
      expect(command.input.ClientId).toBe(TEST_CLIENT_ID);
      expect(command.input.ChallengeName).toBe(CUSTOM_CHALLENGE);
      expect(command.input.Session).toBe(TEST_SESSION);
      expect(command.input.ChallengeResponses.ANSWER).toBe("123456");
      expect(command.input.ChallengeResponses.USERNAME).toBe(TEST_EMAIL);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("refreshToken", () => {
    it("should call AdminInitiateAuthCommand with correct parameters", async () => {
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: "new-access-token",
          IdToken: "new-id-token",
        },
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await service.refreshToken("valid-refresh-token");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.type).toBe("AdminInitiateAuthCommand");
      expect(command.input.UserPoolId).toBe("us-east-1_testpool");
      expect(command.input.ClientId).toBe(TEST_CLIENT_ID);
      expect(command.input.AuthFlow).toBe("REFRESH_TOKEN_AUTH");
      expect(command.input.AuthParameters.REFRESH_TOKEN).toBe(
        "valid-refresh-token"
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("globalSignOut", () => {
    it("should call GlobalSignOutCommand with correct parameters", async () => {
      mockSend.mockResolvedValueOnce({});

      await service.globalSignOut("valid-access-token");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.type).toBe("GlobalSignOutCommand");
      expect(command.input.AccessToken).toBe("valid-access-token");
    });
  });

  describe("createSignInResult", () => {
    it("should format result correctly", () => {
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: SESSION_TOKEN,
        ChallengeParameters: { USERNAME: TEST_EMAIL },
      };

      const result = service.createSignInResult(
        CODE_SENT_MESSAGE,
        cognitoResponse
      );

      expect(result.message).toBe(CODE_SENT_MESSAGE);
      expect(result.data.ChallengeName).toBe(CUSTOM_CHALLENGE);
      expect(result.data.Session).toBe(SESSION_TOKEN);
      expect(result.data.ChallengeParameters).toEqual({
        USERNAME: TEST_EMAIL,
      });
    });

    it("should handle empty ChallengeParameters", () => {
      const cognitoResponse = {
        ChallengeName: CUSTOM_CHALLENGE,
        Session: SESSION_TOKEN,
      };

      const result = service.createSignInResult(
        CODE_SENT_MESSAGE,
        cognitoResponse
      );

      expect(result.data.ChallengeParameters).toEqual({});
    });
  });

  describe("createConfirmSignInResult", () => {
    it("should format auth result correctly", () => {
      const cognitoResponse = {
        AuthenticationResult: {
          AccessToken: ACCESS_TOKEN,
          ExpiresIn: 3600,
          TokenType: "Bearer",
          RefreshToken: REFRESH_TOKEN,
          IdToken: ID_TOKEN,
        },
      };

      const result = service.createConfirmSignInResult(
        "Authenticated",
        cognitoResponse
      );

      expect(result.message).toBe("Authenticated");
      expect(result.data?.accessToken).toBe(ACCESS_TOKEN);
      expect(result.data?.expiresIn).toBe(3600);
      expect(result.data?.tokenType).toBe("Bearer");
      expect(result.data?.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.data?.idToken).toBe(ID_TOKEN);
    });

    it("should handle missing AuthenticationResult", () => {
      const cognitoResponse = {};

      const result = service.createConfirmSignInResult(
        "Authentication pending",
        cognitoResponse
      );

      expect(result.message).toBe("Authentication pending");
      expect(result.data).toBeUndefined();
    });
  });

  describe("handleErrorConfirmSignin", () => {
    it("should handle session expired error", () => {
      const error = new Error("Invalid session for the user.");

      const result = service.handleErrorConfirmSignin(error);

      expect(result.message).toBe(
        "Your login session has expired. Please log in again."
      );
    });

    it("should handle incorrect username or password error", () => {
      const error = new Error("Incorrect username or password.");

      const result = service.handleErrorConfirmSignin(error);

      expect(result.message).toBe(
        "The verification code is not valid, please request a new one."
      );
    });

    it("should rethrow unknown errors", () => {
      const error = new Error("Unknown Cognito error");

      expect(() => service.handleErrorConfirmSignin(error)).toThrow(
        "Unknown Cognito error"
      );
    });
  });
});
