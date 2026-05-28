/**
 * @file valkey-pubsub.test.ts
 * @description Unit tests for ValkeyPubSub adapter
 * @module subscription/pubsub
 */

import { vi, expect, Mocked } from "vitest";
import { ValkeyPubSub } from "./valkey-pubsub";
import { ValkeyService } from "../../valkey/valkey.service";
import {
  ApiGatewayManagementApiClient,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";

// Mock dependencies
vi.mock("../../valkey/valkey.service");
vi.mock("@aws-sdk/client-apigatewaymanagementapi");

/**
 * Test context interface
 */
interface TestContext {
  pubSub: ValkeyPubSub;
  mockValkeyService: Mocked<ValkeyService>;
  mockApiGatewayClient: Mocked<ApiGatewayManagementApiClient>;
}

/**
 * Creates mock ValkeyService
 * @returns Mocked ValkeyService
 */
const createMockValkeyService = (): Mocked<ValkeyService> => {
  return {
    getSubscribers: vi.fn().mockResolvedValue([]),
    removeConnection: vi.fn().mockResolvedValue(undefined),
    setConnection: vi.fn(),
    getConnection: vi.fn(),
    getConnectionUser: vi.fn(),
    registerSubscription: vi.fn(),
    unregisterSubscription: vi.fn(),
    publish: vi.fn(),
    onModuleInit: vi.fn(),
    onModuleDestroy: vi.fn(),
    getClient: vi.fn(),
  } as unknown as Mocked<ValkeyService>;
};

/** Test constants */
const TEST_OPERATION_NAME = "onPostCreated";
const TEST_ENTITY_NAME = "Post";
const TIMEOUT_MS = 50;

/**
 * Creates a timeout promise for testing
 * @param ms - Timeout duration in milliseconds
 * @returns Promise that resolves to "timeout" after ms
 */
const createTimeoutPromise = (ms: number): Promise<string> =>
  new Promise(resolve => {
    setTimeout(() => resolve("timeout"), ms);
  });

describe("ValkeyPubSub", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(() => {
    vi.clearAllMocks();

    ctx.mockValkeyService = createMockValkeyService();

    ctx.mockApiGatewayClient = {
      send: vi.fn().mockResolvedValue({}) as Mock,
    } as unknown as Mocked<ApiGatewayManagementApiClient>;

    (ApiGatewayManagementApiClient as unknown as Mock).mockImplementation(
      function () {
        return ctx.mockApiGatewayClient;
      }
    );

    // Set environment variable for API Gateway endpoint
    process.env.WEBSOCKET_API_ENDPOINT =
      "https://test.execute-api.us-east-1.amazonaws.com/dev";

    ctx.pubSub = new ValkeyPubSub(ctx.mockValkeyService);
  });

  afterEach(() => {
    delete process.env.WEBSOCKET_API_ENDPOINT;
  });

  describe("publish", () => {
    it("should send message to all matching subscribers", async () => {
      const subscribers = [
        {
          connectionId: "conn-1",
          subscriptionId: "sub-1",
          operationName: "onPostCreated",
          filters: {},
          registeredAt: 1234567890,
        },
        {
          connectionId: "conn-2",
          subscriptionId: "sub-2",
          operationName: "onPostCreated",
          filters: {},
          registeredAt: 1234567890,
        },
      ];

      ctx.mockValkeyService.getSubscribers.mockResolvedValue(subscribers);

      await ctx.pubSub.publish("onPostCreated", { id: "post-123" });

      expect(ctx.mockValkeyService.getSubscribers).toHaveBeenCalledWith(
        "onPostCreated",
        {}
      );
      expect(ctx.mockApiGatewayClient.send).toHaveBeenCalledTimes(2);
    });

    it("should not send if no subscribers", async () => {
      ctx.mockValkeyService.getSubscribers.mockResolvedValue([]);

      await ctx.pubSub.publish("onPostCreated", { id: "post-123" });

      expect(ctx.mockApiGatewayClient.send).not.toHaveBeenCalled();
    });

    it("should handle 410 Gone by removing stale connection", async () => {
      const subscribers = [
        {
          connectionId: "stale-conn",
          subscriptionId: "sub-1",
          operationName: "onPostCreated",
          filters: {},
          registeredAt: 1234567890,
        },
      ];

      ctx.mockValkeyService.getSubscribers.mockResolvedValue(subscribers);
      const goneError = new GoneException({
        message: "Gone",
        $metadata: {},
      });
      (ctx.mockApiGatewayClient.send as Mock).mockRejectedValue(goneError);

      await ctx.pubSub.publish("onPostCreated", { id: "post-123" });

      expect(ctx.mockValkeyService.removeConnection).toHaveBeenCalledWith(
        "stale-conn"
      );
    });

    it("should skip sending if API Gateway not configured", async () => {
      delete process.env.WEBSOCKET_API_ENDPOINT;

      // Create new pubsub without endpoint
      const pubSubNoEndpoint = new ValkeyPubSub(ctx.mockValkeyService);

      const subscribers = [
        {
          connectionId: "conn-1",
          subscriptionId: "sub-1",
          operationName: "onPostCreated",
          filters: {},
          registeredAt: 1234567890,
        },
      ];

      ctx.mockValkeyService.getSubscribers.mockResolvedValue(subscribers);

      await pubSubNoEndpoint.publish("onPostCreated", { id: "post-123" });

      expect(ctx.mockApiGatewayClient.send).not.toHaveBeenCalled();
    });
  });

  describe("publishCreated", () => {
    it("should publish with onEntityCreated operation name", async () => {
      ctx.mockValkeyService.getSubscribers.mockResolvedValue([]);

      await ctx.pubSub.publishCreated(TEST_ENTITY_NAME, {
        id: "123",
        title: "Test",
      });

      expect(ctx.mockValkeyService.getSubscribers).toHaveBeenCalledWith(
        TEST_OPERATION_NAME,
        {}
      );
    });

    it("should include filters when provided", async () => {
      ctx.mockValkeyService.getSubscribers.mockResolvedValue([]);

      await ctx.pubSub.publishCreated(
        TEST_ENTITY_NAME,
        { id: "123" },
        { ownerId: "user-456" }
      );

      expect(ctx.mockValkeyService.getSubscribers).toHaveBeenCalledWith(
        TEST_OPERATION_NAME,
        { ownerId: "user-456" }
      );
    });
  });

  describe("publishUpdated", () => {
    it("should publish with onEntityUpdated operation name", async () => {
      ctx.mockValkeyService.getSubscribers.mockResolvedValue([]);

      await ctx.pubSub.publishUpdated(TEST_ENTITY_NAME, { id: "123" });

      expect(ctx.mockValkeyService.getSubscribers).toHaveBeenCalledWith(
        "onPostUpdated",
        {}
      );
    });
  });

  describe("publishDeleted", () => {
    it("should publish with onEntityDeleted operation name", async () => {
      ctx.mockValkeyService.getSubscribers.mockResolvedValue([]);

      await ctx.pubSub.publishDeleted(TEST_ENTITY_NAME, { id: "123" });

      expect(ctx.mockValkeyService.getSubscribers).toHaveBeenCalledWith(
        "onPostDeleted",
        {}
      );
    });
  });

  describe("asyncIterator", () => {
    it("should return an async iterator", () => {
      const iterator = ctx.pubSub.asyncIterator<string>("onPostCreated");

      expect(iterator).toHaveProperty("next");
      expect(iterator).toHaveProperty("return");
      expect(iterator).toHaveProperty("throw");
    });

    it("should return iterator that never resolves (serverless mode)", async () => {
      const iterator = ctx.pubSub.asyncIterator<string>(TEST_OPERATION_NAME);
      // Create a race between the iterator and a timeout
      const result = await Promise.race([
        iterator.next(),
        createTimeoutPromise(TIMEOUT_MS),
      ]);

      expect(result).toBe("timeout");
    });
  });
});
