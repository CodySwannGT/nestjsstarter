/**
 * @file jwt-auth.guard.test.ts
 * @description Unit tests for JWT authentication guard
 * @module auth/guards
 */

import { vi, expect, Mocked } from "vitest";
import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Test, TestingModule } from "@nestjs/testing";
import {
  generateMockAccessToken,
  MockTokenPayload,
} from "../utils/mock-jwt.util";
import { JwtAuthGuard } from "./jwt-auth.guard";

const TEST_USER_POOL_ID = "us-east-1_testpool";
const TEST_CLIENT_ID = "test-client-id";

vi.mock("@nestjs/graphql", () => ({
  GqlExecutionContext: {
    create: vi.fn(),
  },
}));

/**
 * Creates a mock ExecutionContext for testing
 * @param authHeader - The Authorization header value
 * @returns Mocked ExecutionContext with request
 */
function createMockContext(authHeader?: string): {
  context: ExecutionContext;
  request: { headers: { authorization?: string }; user?: unknown };
} {
  const request: { headers: { authorization?: string }; user?: unknown } = {
    headers: {},
  };
  if (authHeader !== undefined) {
    request.headers.authorization = authHeader;
  }

  const gqlContext = {
    getContext: () => ({ req: request }),
  };

  (GqlExecutionContext.create as Mock).mockReturnValue(gqlContext);

  return {
    context: {} as ExecutionContext,
    request,
  };
}

/**
 * Generates an expired mock token
 * @param userId - User ID for the token
 * @returns Expired JWT token string
 */
function generateExpiredMockToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now - 7200, // 2 hours ago
    exp: now - 3600, // Expired 1 hour ago
    token_use: "access",
    "custom:realUserId": userId,
  };

  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${header}.${body}.local-dev`;
}

describe("JwtAuthGuard", () => {
  const configService: Mocked<ConfigService> = {
    get: vi.fn(),
  } as unknown as Mocked<ConfigService>;

  const guard = new JwtAuthGuard(configService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("canActivate", () => {
    it("should return false for missing Authorization header", async () => {
      const { context } = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return false for non-Bearer token", async () => {
      const { context } = createMockContext("Basic abc123");

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe("canActivate - local mode", () => {
    beforeEach(() => {
      configService.get.mockReturnValue("true");
    });

    it("should validate mock token", async () => {
      const token = generateMockAccessToken("test-user-123");
      const { context } = createMockContext(`Bearer ${token}`);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false for invalid mock token", async () => {
      const { context } = createMockContext("Bearer invalid-token");

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return false for expired mock token", async () => {
      const token = generateExpiredMockToken("test-user-123");
      const { context } = createMockContext(`Bearer ${token}`);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should set request.user with id and sub", async () => {
      const userId = "test-user-456";
      const token = generateMockAccessToken(userId);
      const { context, request } = createMockContext(`Bearer ${token}`);

      await guard.canActivate(context);

      expect(request.user).toEqual({
        id: userId,
        sub: `local-sub-${userId}`,
      });
    });
  });

  describe("canActivate - production mode", () => {
    const mockVerifier = {
      verify: vi.fn(),
    };
    const COGNITO_SUB = "cognito-sub-456";

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === "IS_OFFLINE") return "false";
        if (key === "COGNITO_USER_POOL_ID") return TEST_USER_POOL_ID;
        if (key === "COGNITO_CLIENT_ID") return TEST_CLIENT_ID;
        return undefined;
      });
    });

    it("should use Cognito verifier", async () => {
      // Create a fresh guard for production testing with mocked verifier
      const productionGuard = new JwtAuthGuard(configService);

      // Access private method to inject mock verifier

      (productionGuard as any).cognitoVerifier = mockVerifier;

      mockVerifier.verify.mockResolvedValue({
        sub: "cognito-sub-123",
        "custom:realUserId": "real-user-123",
        "cognito:groups": ["users"],
      });

      const { context, request } = createMockContext(
        "Bearer valid-cognito-token"
      );

      const result = await productionGuard.canActivate(context);

      expect(result).toBe(true);
      expect(mockVerifier.verify).toHaveBeenCalledWith("valid-cognito-token");
      expect(request.user).toEqual({
        id: "real-user-123",
        sub: "cognito-sub-123",
        groups: ["users"],
      });
    });

    it("should return false when Cognito verification fails", async () => {
      const productionGuard = new JwtAuthGuard(configService);

      (productionGuard as any).cognitoVerifier = mockVerifier;

      mockVerifier.verify.mockRejectedValue(
        new Error("Token verification failed")
      );

      const { context } = createMockContext("Bearer invalid-cognito-token");

      const result = await productionGuard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should use sub as id when custom:realUserId is not present", async () => {
      const productionGuard = new JwtAuthGuard(configService);

      (productionGuard as any).cognitoVerifier = mockVerifier;

      mockVerifier.verify.mockResolvedValue({
        sub: COGNITO_SUB,
        "cognito:groups": ["admins"],
      });

      const { context, request } = createMockContext("Bearer valid-token");

      await productionGuard.canActivate(context);

      expect(request.user).toEqual({
        id: COGNITO_SUB,
        sub: COGNITO_SUB,
        groups: ["admins"],
      });
    });
  });

  describe("getCognitoVerifier", () => {
    it("should create verifier with config values", async () => {
      // Create new module to test verifier creation
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) => {
                if (key === "IS_OFFLINE") return "false";
                if (key === "COGNITO_USER_POOL_ID") return "us-east-1_realpool";
                if (key === "COGNITO_CLIENT_ID") return "real-client-id";
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
      expect(testGuard).toBeDefined();
    });

    it("should throw error when Cognito config is missing during canActivate", async () => {
      const missingConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "false";
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const guardWithMissingConfig = new JwtAuthGuard(missingConfigService);
      const { context } = createMockContext("Bearer some-token");

      await expect(guardWithMissingConfig.canActivate(context)).rejects.toThrow(
        "Missing required Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set"
      );
    });
  });

  describe("onModuleInit", () => {
    it("should not throw in offline mode", () => {
      const offlineConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "true";
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const offlineGuard = new JwtAuthGuard(offlineConfigService);

      expect(() => offlineGuard.onModuleInit()).not.toThrow();
    });

    it("should throw in production mode when Cognito config is missing", () => {
      const missingConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "false";
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const guardWithMissingConfig = new JwtAuthGuard(missingConfigService);

      expect(() => guardWithMissingConfig.onModuleInit()).toThrow(
        "Missing required Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set in production mode"
      );
    });

    it("should throw when only COGNITO_USER_POOL_ID is missing", () => {
      const partialConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "false";
          if (key === "COGNITO_CLIENT_ID") return TEST_CLIENT_ID;
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const guardWithPartialConfig = new JwtAuthGuard(partialConfigService);

      expect(() => guardWithPartialConfig.onModuleInit()).toThrow(
        "Missing required Cognito configuration"
      );
    });

    it("should throw when only COGNITO_CLIENT_ID is missing", () => {
      const partialConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "false";
          if (key === "COGNITO_USER_POOL_ID") return TEST_USER_POOL_ID;
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const guardWithPartialConfig = new JwtAuthGuard(partialConfigService);

      expect(() => guardWithPartialConfig.onModuleInit()).toThrow(
        "Missing required Cognito configuration"
      );
    });

    it("should not throw when all Cognito config is present", () => {
      const completeConfigService: Mocked<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === "IS_OFFLINE") return "false";
          if (key === "COGNITO_USER_POOL_ID") return TEST_USER_POOL_ID;
          if (key === "COGNITO_CLIENT_ID") return TEST_CLIENT_ID;
          return undefined;
        }),
      } as unknown as Mocked<ConfigService>;

      const guardWithConfig = new JwtAuthGuard(completeConfigService);

      expect(() => guardWithConfig.onModuleInit()).not.toThrow();
    });
  });
});
