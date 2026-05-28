/**
 * @file default.handler.test.ts
 * @description Unit tests for WebSocket default handler covering protocol dispatch,
 * subscription filter extraction, and error resilience
 * @module websocket/handlers
 */

/* eslint-disable max-lines -- comprehensive test coverage requires extensive test cases */

import { vi, expect, type Mock } from "vitest";

// Mock tracing before handler import — handler calls initializeXRay() at module level
vi.mock("../../tracing", () => ({
  initializeXRay: vi.fn(),
  withXRaySubsegment: vi.fn(async (_name: string, fn: () => Promise<unknown>) =>
    fn()
  ),
}));

// Factory functions required so mocked exports are vi.fn() instances
vi.mock("../shared/valkey-client", () => ({
  registerSubscription: vi.fn(),
  unregisterSubscription: vi.fn(),
}));

vi.mock("../shared/api-gateway-client", () => ({
  sendToConnection: vi.fn(),
}));

import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { defaultHandler } from "./default.handler";
import * as valkeyClient from "../shared/valkey-client";
import * as apiGatewayClient from "../shared/api-gateway-client";

/** Stable connection ID used across tests */
const TEST_CONNECTION_ID = "TEST_CONNECTION_ID";
/** Stable domain name used across tests */
const TEST_DOMAIN_NAME = "TEST_DOMAIN_NAME";
/** Stable stage used across tests */
const TEST_STAGE = "dev";
/** Expected body for internal server errors */
const INTERNAL_ERROR_BODY = "Internal error";
/** Expected body for invalid request context errors */
const INVALID_CONTEXT_BODY = "Invalid request context";

/**
 * Creates a mock API Gateway WebSocket event
 * @param body - Message body serialized to JSON
 * @param overrides - Event property overrides applied after defaults
 * @returns Mock event suitable for Lambda handler invocation
 */
const createMockEvent = (
  body: Record<string, unknown>,
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent => ({
  body: JSON.stringify(body),
  headers: {},
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: "",
  requestContext: {
    connectionId: TEST_CONNECTION_ID,
    domainName: TEST_DOMAIN_NAME,
    stage: TEST_STAGE,
    accountId: "123456789",
    apiId: "test-api",
    domainPrefix: "test",
    extendedRequestId: "test-id",
    httpMethod: "POST",
    authorizer: {},
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: null,
      userArn: null,
    },
    path: "/",
    protocol: "HTTP/1.1",
    requestId: "test-request-id",
    requestTime: "01/Jan/2026:00:00:00 +0000",
    requestTimeEpoch: 1234567890,
    resourceId: "test-resource",
    resourcePath: "/",
  },
  ...overrides,
});

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "test",
  functionVersion: "1",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789:function:test",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "test-log-group",
  logStreamName: "test-log-stream",
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

describe("default handler", () => {
  const mockSendToConnection = apiGatewayClient.sendToConnection as Mock;
  const mockRegisterSubscription = valkeyClient.registerSubscription as Mock;
  const mockUnregisterSubscription =
    valkeyClient.unregisterSubscription as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendToConnection.mockResolvedValue(true);
    mockRegisterSubscription.mockResolvedValue(undefined);
    mockUnregisterSubscription.mockResolvedValue(undefined);
  });

  describe("connection_init", () => {
    it("should respond with connection_ack", async () => {
      const event = createMockEvent({ type: "connection_init" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(mockSendToConnection).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        TEST_DOMAIN_NAME,
        TEST_STAGE,
        { type: "connection_ack" }
      );
      expect(result).toEqual({ statusCode: 200, body: "" });
    });

    it("should return 500 when sending connection_ack fails", async () => {
      mockSendToConnection.mockRejectedValueOnce(new Error("Network failure"));
      const event = createMockEvent({ type: "connection_init" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 500, body: INTERNAL_ERROR_BODY });
    });
  });

  describe("ping", () => {
    it("should respond with pong", async () => {
      const event = createMockEvent({ type: "ping" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(mockSendToConnection).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        TEST_DOMAIN_NAME,
        TEST_STAGE,
        { type: "pong" }
      );
      expect(result).toEqual({ statusCode: 200, body: "" });
    });

    it("should return 500 when sending pong fails", async () => {
      mockSendToConnection.mockRejectedValueOnce(new Error("Network failure"));
      const event = createMockEvent({ type: "ping" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 500, body: INTERNAL_ERROR_BODY });
    });
  });

  describe("subscribe", () => {
    it("should register subscription with ownerId filter", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-123",
        payload: {
          query: "subscription OnPostCreated { onPostCreated { id } }",
          variables: { ownerId: "user-456" },
        },
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-123",
        "OnPostCreated",
        { ownerId: "user-456" }
      );
      expect(result).toEqual({ statusCode: 200, body: "" });
    });

    it("should register subscription with resourceId filter", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-456",
        payload: {
          query: "subscription OnResourceUpdated { onResourceUpdated { id } }",
          variables: { resourceId: "resource-789" },
        },
      });

      await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-456",
        "OnResourceUpdated",
        { resourceId: "resource-789" }
      );
    });

    it("should register subscription with organizationId filter", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-789",
        payload: {
          query: "subscription OnOrgEvent { onOrgEvent { id } }",
          variables: { organizationId: "org-123" },
        },
      });

      await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-789",
        "OnOrgEvent",
        { organizationId: "org-123" }
      );
    });

    it("should register subscription with all three filters combined", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-all",
        payload: {
          query: "subscription OnFullEvent { onFullEvent { id } }",
          variables: {
            resourceId: "res-1",
            ownerId: "owner-2",
            organizationId: "org-3",
          },
        },
      });

      await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-all",
        "OnFullEvent",
        { resourceId: "res-1", ownerId: "owner-2", organizationId: "org-3" }
      );
    });

    it("should ignore non-string variable values when building filters", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-types",
        payload: {
          query: "subscription OnEvent { onEvent { id } }",
          variables: {
            ownerId: 123,
            resourceId: true,
            organizationId: null,
          },
        },
      });

      await defaultHandler(event, mockContext, () => {});

      // Non-string values must not appear in filters
      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-types",
        "OnEvent",
        {}
      );
    });

    it("should use 'unknown' as operation name for anonymous subscriptions", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-anon",
        payload: {
          query: "subscription { onEvent { id } }",
        },
      });

      await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-anon",
        "unknown",
        {}
      );
    });

    it("should register subscription with empty filters when no variables are provided", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-no-vars",
        payload: {
          query: "subscription OnSomething { onSomething { id } }",
        },
      });

      await defaultHandler(event, mockContext, () => {});

      expect(mockRegisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-no-vars",
        "OnSomething",
        {}
      );
    });

    it("should return 400 for subscribe without id", async () => {
      const event = createMockEvent({
        type: "subscribe",
        payload: { query: "subscription { test }" },
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 400,
        body: "Invalid subscribe message",
      });
      expect(mockRegisterSubscription).not.toHaveBeenCalled();
    });

    it("should return 400 for subscribe without query", async () => {
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-123",
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 400,
        body: "Invalid subscribe message",
      });
      expect(mockRegisterSubscription).not.toHaveBeenCalled();
    });

    it("should return 500 when registerSubscription throws", async () => {
      mockRegisterSubscription.mockRejectedValueOnce(
        new Error("Valkey unavailable")
      );
      const event = createMockEvent({
        type: "subscribe",
        id: "sub-err",
        payload: {
          query: "subscription OnSomething { onSomething { id } }",
        },
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 500, body: INTERNAL_ERROR_BODY });
    });
  });

  describe("complete", () => {
    it("should unregister subscription from Valkey", async () => {
      const event = createMockEvent({
        type: "complete",
        id: "sub-123",
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(mockUnregisterSubscription).toHaveBeenCalledWith(
        TEST_CONNECTION_ID,
        "sub-123"
      );
      expect(result).toEqual({ statusCode: 200, body: "" });
    });

    it("should return 400 for complete without id", async () => {
      const event = createMockEvent({ type: "complete" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 400,
        body: "Invalid complete message",
      });
      expect(mockUnregisterSubscription).not.toHaveBeenCalled();
    });

    it("should return 500 when unregisterSubscription throws", async () => {
      mockUnregisterSubscription.mockRejectedValueOnce(
        new Error("Valkey unavailable")
      );
      const event = createMockEvent({
        type: "complete",
        id: "sub-err",
      });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 500, body: INTERNAL_ERROR_BODY });
    });
  });

  describe("unhandled message types", () => {
    it("should return 200 for unrecognized message types without side effects", async () => {
      const event = createMockEvent({ type: "connection_ack" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 200, body: "" });
      expect(mockSendToConnection).not.toHaveBeenCalled();
      expect(mockRegisterSubscription).not.toHaveBeenCalled();
      expect(mockUnregisterSubscription).not.toHaveBeenCalled();
    });

    it("should return 200 for 'next' message type without side effects", async () => {
      const event = createMockEvent({ type: "next", id: "sub-123" });

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 200, body: "" });
      expect(mockSendToConnection).not.toHaveBeenCalled();
      expect(mockRegisterSubscription).not.toHaveBeenCalled();
    });
  });

  describe("request context validation", () => {
    it("should return 500 when connectionId is missing", async () => {
      const event = createMockEvent({ type: "ping" });
      event.requestContext.connectionId = undefined;

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 500,
        body: INVALID_CONTEXT_BODY,
      });
      expect(mockSendToConnection).not.toHaveBeenCalled();
    });

    it("should return 500 when domainName is missing", async () => {
      const event = createMockEvent({ type: "ping" });
      event.requestContext.domainName = undefined;

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 500,
        body: INVALID_CONTEXT_BODY,
      });
      expect(mockSendToConnection).not.toHaveBeenCalled();
    });

    it("should return 500 when stage is missing", async () => {
      const event = createMockEvent({ type: "ping" });
      // @ts-expect-error — testing runtime undefined on a required field
      event.requestContext.stage = undefined;

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 500,
        body: INVALID_CONTEXT_BODY,
      });
      expect(mockSendToConnection).not.toHaveBeenCalled();
    });
  });

  describe("body parsing", () => {
    it("should return 400 for invalid JSON body", async () => {
      const event = createMockEvent({});
      event.body = "not json";

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 400, body: "Invalid JSON" });
    });

    it("should return 400 for empty string body", async () => {
      const event = createMockEvent({});
      event.body = "";

      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 400, body: "Invalid JSON" });
    });

    it("should treat null body as empty object and handle gracefully", async () => {
      const event = createMockEvent({});
      event.body = null;

      // null body falls back to "{}" which parses to {} — no recognised type hits default branch
      const result = await defaultHandler(event, mockContext, () => {});

      expect(result).toEqual({ statusCode: 200, body: "" });
      expect(mockSendToConnection).not.toHaveBeenCalled();
      expect(mockRegisterSubscription).not.toHaveBeenCalled();
      expect(mockUnregisterSubscription).not.toHaveBeenCalled();
    });
  });
});

/* eslint-enable max-lines -- end of comprehensive WebSocket default handler test coverage */
