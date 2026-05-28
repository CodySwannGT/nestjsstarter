/**
 * @file disconnect.handler.test.ts
 * @description Unit tests for WebSocket disconnect handler
 * @module websocket/handlers
 */

import { vi, expect, type Mock } from "vitest";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

vi.mock("../../tracing", () => ({
  initializeXRay: vi.fn(),
  getXRaySegment: vi.fn(),
  getXRayNamespace: vi.fn(),
  withXRaySubsegment: vi.fn((_name: string, fn: (sub: unknown) => unknown) =>
    fn(undefined)
  ),
}));

import { disconnect } from "./disconnect.handler";
import * as valkeyClient from "../shared/valkey-client";

// Mock the valkey client
vi.mock("../shared/valkey-client");

/**
 * Creates a mock API Gateway WebSocket event
 * @param overrides - Event property overrides
 * @returns Mock event
 */
const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: "GET",
  isBase64Encoded: false,
  path: "/",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: "",
  requestContext: {
    connectionId: "test-connection-123",
    accountId: "123456789",
    apiId: "test-api",
    domainName: "test.execute-api.us-east-1.amazonaws.com",
    domainPrefix: "test",
    extendedRequestId: "test-id",
    httpMethod: "GET",
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
    stage: "dev",
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

describe("disconnect handler", () => {
  const mockRemoveConnection = valkeyClient.removeConnection as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveConnection.mockResolvedValue(undefined);
  });

  it("should remove connection from Valkey", async () => {
    const event = createMockEvent();

    const result = await disconnect(event, mockContext, () => {});

    expect(mockRemoveConnection).toHaveBeenCalledWith("test-connection-123");
    expect(result).toEqual({ statusCode: 200, body: "Disconnected" });
  });

  it("should handle missing connectionId gracefully", async () => {
    const event = createMockEvent();
    event.requestContext.connectionId = undefined;

    const result = await disconnect(event, mockContext, () => {});

    expect(result).toEqual({ statusCode: 200, body: "Disconnected" });
    expect(mockRemoveConnection).not.toHaveBeenCalled();
  });

  it("should return 200 even when Valkey fails (idempotent)", async () => {
    const event = createMockEvent();
    mockRemoveConnection.mockRejectedValue(new Error("Valkey error"));

    const result = await disconnect(event, mockContext, () => {});

    expect(result).toEqual({ statusCode: 200, body: "Disconnected" });
  });
});
