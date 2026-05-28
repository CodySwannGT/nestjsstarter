/* eslint-disable max-lines -- Comprehensive behavioral coverage for ws-authorizer requires testing multiple JWT paths, offline/production modes, policy structure, and singleton config validation */
/**
 * @file ws-authorizer.handler.test.ts
 * @description Unit tests for WebSocket Lambda authorizer
 * @module websocket/authorizer
 * @remarks
 * Tests verify JWT validation, IAM policy generation, and authorization
 * outcomes for both online and offline modes. Coverage includes:
 * - No-token and empty-string-token deny paths
 * - Offline mode: valid JWT, expired JWT, malformed JWT (too many parts,
 *   too few parts, non-JSON payload), missing optional fields
 * - Production mode: Cognito verifier success/failure, context mapping,
 *   optional field defaults, missing config (singleton reset via isolateModules)
 * - Policy structure: Version, Action, Effect, Resource
 */

import { vi, expect, type Mock } from "vitest";
import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda";

// Mock tracing before importing the handler module (it calls initializeXRay at module level)
vi.mock("../../tracing", () => ({
  initializeXRay: vi.fn(),
  withXRaySubsegment: vi.fn(async (_name: string, fn: () => Promise<unknown>) =>
    fn()
  ),
}));

// Mock aws-jwt-verify
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: vi.fn().mockReturnValue({
      verify: vi.fn(),
    }),
  },
}));

// Mock configuration
vi.mock("../../config/configuration", () => ({
  configuration: vi.fn(),
}));

import { CognitoJwtVerifier } from "aws-jwt-verify";
import { configuration } from "../../config/configuration";
import { wsAuthorizer } from "./ws-authorizer.handler";

/** Stable user ID shared across production success test assertions */
const MOCK_PROD_USER_ID = "user-prod-123";

/**
 * Builds a mock API Gateway authorizer event
 * @param token - Optional JWT token to include in query parameters
 * @returns Mock authorizer event
 */
const buildMockEvent = (token?: string): APIGatewayRequestAuthorizerEvent => ({
  type: "REQUEST",
  methodArn: "arn:aws:execute-api:us-east-1:123456789:abc123/dev/$connect",
  resource: "$connect",
  path: "/$connect",
  httpMethod: "GET",
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: token ? { token } : null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: "123456789",
    apiId: "abc123",
    stage: "dev",
    requestId: "req-123",
    routeKey: "$connect",
    identity: {
      apiKey: null,
      apiKeyId: null,
      accountId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: null,
      userArn: null,
      clientCert: null,
    },
    resourcePath: "$connect",
    httpMethod: "GET",
    path: "/$connect",
    protocol: "WebSocket",
    authorizer: {},
    requestTimeEpoch: 1234567890,
    resourceId: "abc",
    domainName: "example.com",
    domainPrefix: "abc",
    extendedRequestId: "req-123",
    requestTime: "01/Jan/2024:00:00:00 +0000",
  },
});

/**
 * Creates a valid JWT with the given payload (base64url encoded)
 * @param payload - The JWT payload to encode
 * @param expired - Whether to create an expired token
 * @returns A mock JWT string
 */
const createMockJwt = (
  payload: Record<string, unknown>,
  expired = false
): string => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);
  const finalPayload = {
    ...payload,
    exp: expired ? now - 3600 : now + 3600,
    iat: now,
  };

  const encodedPayload = Buffer.from(JSON.stringify(finalPayload))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${header}.${encodedPayload}.mock-signature`;
};

/**
 * Type-safe helper to narrow wsAuthorizer's unknown result to a typed policy
 * @param result - Raw return value from wsAuthorizer
 * @returns Typed APIGatewayAuthorizerResult
 * @remarks
 * Avoids repetitive inline `as` casts in every test assertion, making
 * the intent of each assertion clearer.
 */
const asAuthResult = (result: unknown): APIGatewayAuthorizerResult =>
  result as APIGatewayAuthorizerResult;

/**
 * Loads an isolated wsAuthorizer instance configured with missing Cognito credentials.
 * @returns The wsAuthorizer handler loaded from a fresh module registry
 * @remarks
 * The module-level `cognitoVerifier` singleton means a fresh module registry
 * (via vi.resetModules + dynamic import) is required to exercise the userPoolId/clientId
 * guard in getCognitoVerifier. Without this isolation, the cached verifier
 * from a prior test would bypass the config validation entirely.
 */
const loadHandlerWithMissingCognitoConfig = async (): Promise<
  typeof wsAuthorizer
> => {
  vi.resetModules();
  vi.doMock("../../tracing", () => ({
    initializeXRay: vi.fn(),
    withXRaySubsegment: vi.fn(
      async (_name: string, fn: () => Promise<unknown>) => fn()
    ),
  }));
  vi.doMock("../../config/configuration", () => ({
    configuration: vi.fn().mockReturnValue({
      app: { isOffline: false },
      cognito: { userPoolId: undefined, clientId: undefined },
    }),
  }));
  vi.doMock("aws-jwt-verify", () => ({
    CognitoJwtVerifier: {
      create: vi.fn().mockReturnValue({ verify: vi.fn() }),
    },
  }));

  return (await import("./ws-authorizer.handler")).wsAuthorizer;
};

/** Offline config mock */
const offlineConfig = {
  app: { isOffline: true },
  cognito: { userPoolId: undefined, clientId: undefined },
};

/** Online config mock */
const onlineConfig = {
  app: { isOffline: false },
  cognito: {
    userPoolId: "us-east-1_abc123",
    clientId: "client-id-123",
  },
};

const mockConfiguration = configuration as Mock;

describe("wsAuthorizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when no token is provided", () => {
    it("should return a Deny policy for anonymous user", async () => {
      mockConfiguration.mockReturnValue(offlineConfig);
      const event = buildMockEvent();

      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.principalId).toBe("anonymous");
      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });

    it("should return a Deny policy when token is an empty string", async () => {
      mockConfiguration.mockReturnValue(offlineConfig);
      // Build event with explicit empty-string token to exercise the !token falsy guard
      const event: APIGatewayRequestAuthorizerEvent = {
        ...buildMockEvent(),
        queryStringParameters: { token: "" },
      };

      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.principalId).toBe("anonymous");
      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });
  });

  describe("in offline mode", () => {
    beforeEach(() => {
      mockConfiguration.mockReturnValue(offlineConfig);
    });

    it("should allow a valid unexpired JWT without signature verification", async () => {
      const token = createMockJwt({
        sub: "user-123",
        email: "test@example.com",
        "cognito:groups": ["admin"],
      });

      const event = buildMockEvent(token);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.principalId).toBe("user-123");
      expect(result.policyDocument.Statement[0].Effect).toBe("Allow");
    });

    it("should return context with userId, groups, and email", async () => {
      const token = createMockJwt({
        sub: "user-456",
        email: "user@example.com",
        "cognito:groups": ["users", "admin"],
      });

      const event = buildMockEvent(token);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.context?.userId).toBe("user-456");
      expect(result.context?.email).toBe("user@example.com");
      expect(JSON.parse(result.context?.groups as string)).toEqual([
        "users",
        "admin",
      ]);
    });

    it("should deny connection when token is expired", async () => {
      const token = createMockJwt(
        { sub: "user-123", email: "test@example.com" },
        true
      );

      const event = buildMockEvent(token);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });

    it("should deny connection for a JWT with too many segments", async () => {
      const event = buildMockEvent("not.a.valid.jwt.format.extra");
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });

    it("should deny connection for a JWT with only two segments", async () => {
      // A two-part token (header.payload, signature stripped) is a realistic
      // attack pattern and exercises the parts.length !== 3 boundary check
      const event = buildMockEvent("header.payload");
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });

    it("should deny connection when the JWT payload is not valid JSON", async () => {
      // Construct a three-part token whose middle segment decodes to plain text,
      // not a JSON object, causing JSON.parse to throw a SyntaxError
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const nonJsonPayload = Buffer.from("not-json")
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const corruptedToken = `${header}.${nonJsonPayload}.mock-signature`;

      const event = buildMockEvent(corruptedToken);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
    });

    it("should handle JWT without cognito groups by defaulting to empty array", async () => {
      const token = createMockJwt({
        sub: "user-789",
        email: "no-groups@example.com",
      });

      const event = buildMockEvent(token);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.context?.userId).toBe("user-789");
      expect(JSON.parse(result.context?.groups as string)).toEqual([]);
    });

    it("should handle JWT without email by defaulting to empty string", async () => {
      const token = createMockJwt({ sub: "user-no-email" });

      const event = buildMockEvent(token);
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.context?.email).toBe("");
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      mockConfiguration.mockReturnValue(onlineConfig);
    });

    it("should allow connection and populate context when Cognito verifier validates the token", async () => {
      const mockVerify = CognitoJwtVerifier.create("" as never).verify as Mock;
      mockVerify.mockResolvedValue({
        sub: MOCK_PROD_USER_ID,
        email: "prod@example.com",
        "cognito:groups": ["users"],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123",
        aud: "client-id-123",
        token_use: "access",
      });

      const event = buildMockEvent("valid-production-token");
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.principalId).toBe(MOCK_PROD_USER_ID);
      expect(result.policyDocument.Statement[0].Effect).toBe("Allow");
      expect(result.context?.userId).toBe(MOCK_PROD_USER_ID);
      expect(result.context?.email).toBe("prod@example.com");
      expect(JSON.parse(result.context?.groups as string)).toEqual(["users"]);
    });

    it("should default email to empty string and groups to empty array when absent from verified payload", async () => {
      const mockVerify = CognitoJwtVerifier.create("" as never).verify as Mock;
      mockVerify.mockResolvedValue({
        sub: "user-minimal",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123",
        token_use: "access",
      });

      const event = buildMockEvent("minimal-production-token");
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Allow");
      expect(result.context?.email).toBe("");
      expect(JSON.parse(result.context?.groups as string)).toEqual([]);
    });

    it("should deny connection when Cognito verifier throws an error", async () => {
      const mockVerify = CognitoJwtVerifier.create("" as never).verify as Mock;
      mockVerify.mockRejectedValue(new Error("Token verification failed"));

      const event = buildMockEvent("invalid-production-token");
      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
      expect(result.principalId).toBe("anonymous");
    });

    it("should deny connection when Cognito user pool ID is not configured", async () => {
      const isolatedHandler = await loadHandlerWithMissingCognitoConfig();

      const event = buildMockEvent("some-token");
      const result = asAuthResult(
        await isolatedHandler(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
      expect(result.principalId).toBe("anonymous");
    });
  });

  describe("policy generation", () => {
    it("should include the methodArn in the policy resource", async () => {
      mockConfiguration.mockReturnValue(offlineConfig);
      const event = buildMockEvent();
      const methodArn =
        "arn:aws:execute-api:us-east-1:123456789:abc123/dev/$connect";

      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Resource).toBe(methodArn);
    });

    it("should use correct IAM policy version", async () => {
      mockConfiguration.mockReturnValue(offlineConfig);
      const event = buildMockEvent();

      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Version).toBe("2012-10-17");
    });

    it("should use execute-api:Invoke as the policy action", async () => {
      mockConfiguration.mockReturnValue(offlineConfig);
      const event = buildMockEvent();

      const result = asAuthResult(
        await wsAuthorizer(event, {} as never, () => {})
      );

      expect(result.policyDocument.Statement[0].Action).toBe(
        "execute-api:Invoke"
      );
    });
  });
});
/* eslint-enable max-lines -- re-enable after test file */
