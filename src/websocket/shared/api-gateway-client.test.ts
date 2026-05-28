/**
 * @file api-gateway-client.test.ts
 * @description Unit tests for API Gateway Management API client
 * @module websocket/shared
 * @remarks
 * Tests cover the endpoint-based client caching strategy, message sending,
 * GoneException cleanup on stale connections, and error propagation for
 * unexpected failures.
 */

import { vi, expect, type Mock, MockedClass } from "vitest";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => {
  /**
   * Mock GoneException for simulating stale WebSocket connections in tests.
   */
  class GoneException extends Error {
    /**
     * Creates a GoneException instance with an optional message.
     * @param args - Optional constructor arguments
     * @param args.message - Optional error message override
     */
    constructor(args?: { message?: string }) {
      super(args?.message ?? "Gone");
      this.name = "GoneException";
    }
  }

  return {
    ApiGatewayManagementApiClient: vi.fn().mockImplementation(function () {
      return { send: mockSend };
    }),
    PostToConnectionCommand: vi.fn().mockImplementation(function (
      input: unknown
    ) {
      return { input };
    }),
    GoneException,
  };
});

vi.mock("./valkey-client");

import {
  ApiGatewayManagementApiClient,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import * as valkeyClient from "./valkey-client";
import { getApiGatewayClient, sendToConnection } from "./api-gateway-client";

const MockApiGatewayClient = ApiGatewayManagementApiClient as MockedClass<
  typeof ApiGatewayManagementApiClient
>;

const mockRemoveConnection = valkeyClient.removeConnection as Mock;

describe("api-gateway-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getApiGatewayClient", () => {
    it("creates a new client for a new domain and stage", () => {
      const client = getApiGatewayClient(
        "abc123.execute-api.us-east-1.amazonaws.com",
        "prod"
      );

      expect(MockApiGatewayClient).toHaveBeenCalledWith({
        endpoint: "https://abc123.execute-api.us-east-1.amazonaws.com/prod",
      });
      expect(client).toBeDefined();
    });

    it("returns the cached client when called again with the same domain and stage", () => {
      const domain = "cached.execute-api.us-east-1.amazonaws.com";
      const stage = "staging";

      const first = getApiGatewayClient(domain, stage);
      const second = getApiGatewayClient(domain, stage);

      expect(first).toBe(second);
      // Constructor should only have been called once for this endpoint across both calls
      const callsForEndpoint = MockApiGatewayClient.mock.calls.filter(
        ([arg]) =>
          (arg as { endpoint: string }).endpoint ===
          `https://${domain}/${stage}`
      );
      expect(callsForEndpoint).toHaveLength(1);
    });

    it("creates separate clients for different domain and stage combinations", () => {
      const clientA = getApiGatewayClient(
        "domain-a.execute-api.us-east-1.amazonaws.com",
        "dev"
      );
      const clientB = getApiGatewayClient(
        "domain-b.execute-api.us-east-1.amazonaws.com",
        "dev"
      );

      expect(clientA).not.toBe(clientB);
    });
  });

  describe("sendToConnection", () => {
    const connectionId = "conn-abc123";
    const domainName = "send-test.execute-api.us-east-1.amazonaws.com";
    const stage = "dev";

    it("sends successfully and returns true when data is an object", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await sendToConnection(connectionId, domainName, stage, {
        type: "update",
        payload: { id: 1 },
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("sends successfully and returns true when data is a string", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await sendToConnection(
        connectionId,
        domainName,
        stage,
        "plain text message"
      );

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      // Verify the command was built with a Buffer containing the raw string
      const commandArg = mockSend.mock.calls[0][0] as {
        input: { Data: Buffer };
      };
      expect(commandArg.input.Data.toString()).toBe("plain text message");
    });

    it("handles GoneException by calling removeConnection and returns false", async () => {
      const goneError = new GoneException({ message: "Gone" });
      mockSend.mockRejectedValueOnce(goneError);
      mockRemoveConnection.mockResolvedValueOnce(undefined);

      const result = await sendToConnection(connectionId, domainName, stage, {
        event: "test",
      });

      expect(result).toBe(false);
      expect(mockRemoveConnection).toHaveBeenCalledWith(connectionId);
    });

    it("rethrows errors that are not GoneException", async () => {
      const networkError = new Error("Network timeout");
      mockSend.mockRejectedValueOnce(networkError);

      await expect(
        sendToConnection(connectionId, domainName, stage, { event: "test" })
      ).rejects.toThrow("Network timeout");

      expect(mockRemoveConnection).not.toHaveBeenCalled();
    });
  });
});
