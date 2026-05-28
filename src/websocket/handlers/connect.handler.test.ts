/**
 * @file connect.handler.test.ts
 * @description Unit tests for WebSocket connect handler covering connection storage,
 * user context resolution, and error resilience
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

import { connect } from "./connect.handler";
import * as valkeyClient from "../shared/valkey-client";
import * as tracing from "../../tracing";

// Mock the valkey client
vi.mock("../shared/valkey-client");

/** Test connection ID constant */
const TEST_CONNECTION_ID = "TEST_CONNECTION_ID";

/** Expected body when connection storage fails */
const CONNECTION_FAILED_BODY = "Connection failed";

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
    connectionId: TEST_CONNECTION_ID,
    authorizer: {
      userId: "user-456",
      groups: '["admin", "users"]',
    },
    accountId: "123456789",
    apiId: "test-api",
    domainName: "test.execute-api.us-east-1.amazonaws.com",
    domainPrefix: "test",
    extendedRequestId: "test-id",
    httpMethod: "GET",
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

describe("connect handler", () => {
  const mockSetConnection = valkeyClient.setConnection as Mock;
  const mockWithXRaySubsegment = tracing.withXRaySubsegment as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetConnection.mockResolvedValue(undefined);
    mockWithXRaySubsegment.mockImplementation(
      async (_name: string, fn: () => Promise<unknown>) => fn()
    );
  });

  it("should store connectionId in Valkey with user context", async () => {
    const event = createMockEvent();

    const result = await connect(event, mockContext, () => {});

    expect(mockSetConnection).toHaveBeenCalledWith(TEST_CONNECTION_ID, {
      userId: "user-456",
      groups: ["admin", "users"],
      connectedAt: expect.any(Number),
    });
    expect(result).toEqual({ statusCode: 200, body: "Connected" });
  });

  it("should handle missing connectionId", async () => {
    const event = createMockEvent();
    event.requestContext.connectionId = undefined;

    const result = await connect(event, mockContext, () => {});

    expect(result).toEqual({ statusCode: 500, body: "No connectionId" });
    expect(mockSetConnection).not.toHaveBeenCalled();
  });

  it("should handle missing authorizer with anonymous user", async () => {
    const event = createMockEvent();
    event.requestContext.authorizer = undefined;

    const result = await connect(event, mockContext, () => {});

    expect(mockSetConnection).toHaveBeenCalledWith(TEST_CONNECTION_ID, {
      userId: "anonymous",
      groups: [],
      connectedAt: expect.any(Number),
    });
    expect(result).toEqual({ statusCode: 200, body: "Connected" });
  });

  it("should return 500 when Valkey fails", async () => {
    const event = createMockEvent();
    mockSetConnection.mockRejectedValue(new Error(CONNECTION_FAILED_BODY));

    const result = await connect(event, mockContext, () => {});

    expect(result).toEqual({ statusCode: 500, body: CONNECTION_FAILED_BODY });
  });

  it("should handle malformed JSON in authorizer groups", async () => {
    const event = createMockEvent();
    event.requestContext.authorizer = {
      userId: "user-789",
      groups: "not-valid-json",
    };

    const result = await connect(event, mockContext, () => {});

    expect(result).toEqual({ statusCode: 500, body: CONNECTION_FAILED_BODY });
    expect(mockSetConnection).not.toHaveBeenCalled();
  });

  it("should handle empty string userId by using it as-is", async () => {
    const event = createMockEvent();
    event.requestContext.authorizer = {
      userId: "",
      groups: "[]",
    };

    const result = await connect(event, mockContext, () => {});

    // ?? only substitutes null/undefined, so "" passes through as-is
    expect(mockSetConnection).toHaveBeenCalledWith(TEST_CONNECTION_ID, {
      userId: "",
      groups: [],
      connectedAt: expect.any(Number),
    });
    expect(result).toEqual({ statusCode: 200, body: "Connected" });
  });

  it("should pass connectionId as annotation to XRay subsegment", async () => {
    const event = createMockEvent();

    await connect(event, mockContext, () => {});

    expect(mockWithXRaySubsegment).toHaveBeenCalledWith(
      "WebSocket:Connect",
      expect.any(Function),
      { annotations: { connectionId: TEST_CONNECTION_ID } }
    );
  });

  it("should not call XRay subsegment when connectionId is missing", async () => {
    const event = createMockEvent();
    event.requestContext.connectionId = undefined;

    await connect(event, mockContext, () => {});

    expect(mockWithXRaySubsegment).not.toHaveBeenCalled();
  });
});
