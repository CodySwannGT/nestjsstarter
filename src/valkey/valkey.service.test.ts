/* eslint-disable max-lines -- Comprehensive ValkeyService tests covering all lifecycle methods, connection operations, subscription management, and error paths require extensive test cases */
/**
 * @file valkey.service.test.ts
 * @description Unit tests for ValkeyService
 * @module valkey
 */

import { vi, expect, Mocked } from "vitest";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import Redis from "ioredis";
import { Configuration } from "../config/configuration";
import { ValkeyService } from "./valkey.service";

// Mock ioredis
vi.mock("ioredis");

/**
 * Test context interface for ValkeyService tests
 */
interface TestContext {
  module: TestingModule;
  service: ValkeyService;
  mockRedis: Mocked<Redis>;
}

/**
 * Creates a mock Redis instance
 * @returns Mocked Redis instance
 */
const createMockRedis = (): Mocked<Redis> => {
  return {
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    mget: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn().mockReturnValue({
      del: vi.fn().mockReturnThis(),
      setex: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      srem: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    smembers: vi.fn().mockResolvedValue([]),
    publish: vi.fn().mockResolvedValue(0),
    quit: vi.fn().mockResolvedValue("OK"),
    on: vi.fn(),
  } as unknown as Mocked<Redis>;
};

/**
 * Creates a mock ConfigService with default values
 * @param overrides - Optional config overrides
 * @returns Mock ConfigService instance
 */
const createMockConfigService = (
  overrides: Partial<{ host: string; port: number }> = {}
): ConfigService<Configuration, true> => {
  const config = {
    valkey: {
      host: overrides.host ?? "localhost",
      port: overrides.port ?? 6379,
      maxRetriesPerRequest: 3,
    },
  };

  return {
    get: vi.fn((key: string) => {
      const keys = key.split(".");

      return keys.reduce((obj: any, k) => obj?.[k], config);
    }),
  } as unknown as ConfigService<Configuration, true>;
};

/** Test constants */
const TEST_CONNECTION_ID = "test-connection";

describe("ValkeyService", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    ctx.mockRedis = createMockRedis();
    (Redis as unknown as Mock).mockImplementation(function () {
      return ctx.mockRedis;
    });

    ctx.module = await Test.createTestingModule({
      providers: [
        ValkeyService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    ctx.service = ctx.module.get<ValkeyService>(ValkeyService);
    await ctx.service.onModuleInit();
  });

  afterEach(async () => {
    await ctx.module.close();
    vi.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should create Redis client with default config", () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "localhost",
          port: 6379,
        })
      );
    });

    it("should use ConfigService values when set", async () => {
      const customConfigService = createMockConfigService({
        host: "test-host",
        port: 6380,
      });

      const envModule: TestingModule = await Test.createTestingModule({
        providers: [
          ValkeyService,
          {
            provide: ConfigService,
            useValue: customConfigService,
          },
        ],
      }).compile();

      try {
        const service = envModule.get<ValkeyService>(ValkeyService);
        await service.onModuleInit();

        expect(Redis).toHaveBeenCalledWith(
          expect.objectContaining({
            host: "test-host",
            port: 6380,
          })
        );
      } finally {
        await envModule.close();
      }
    });
  });

  describe("onModuleDestroy", () => {
    it("should close Redis connection", async () => {
      await ctx.service.onModuleDestroy();
      expect(ctx.mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe("setConnection", () => {
    it("should store connection data with TTL", async () => {
      const connectionId = "test-connection-123";
      const data = {
        userId: "user-456",
        groups: ["admin", "users"],
        connectedAt: 1234567890,
      };

      await ctx.service.setConnection(connectionId, data);

      expect(ctx.mockRedis.setex).toHaveBeenCalledWith(
        `connection:${connectionId}`,
        86400,
        expect.any(String)
      );

      const storedData = JSON.parse(
        (ctx.mockRedis.setex as Mock).mock.calls[0][2]
      );
      expect(storedData).toEqual({
        userId: "user-456",
        groups: ["admin", "users"],
        connectedAt: 1234567890,
      });
    });
  });

  describe("getConnection", () => {
    it("should return connection data when found", async () => {
      const connectionData = {
        userId: "user-456",
        groups: ["admin"],
        connectedAt: 1234567890,
      };
      ctx.mockRedis.get.mockResolvedValue(JSON.stringify(connectionData));

      const result = await ctx.service.getConnection(TEST_CONNECTION_ID);

      expect(result).toEqual(connectionData);
      expect(ctx.mockRedis.get).toHaveBeenCalledWith(
        `connection:${TEST_CONNECTION_ID}`
      );
    });

    it("should return null when connection not found", async () => {
      ctx.mockRedis.get.mockResolvedValue(null);

      const result = await ctx.service.getConnection("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getConnectionUser", () => {
    it("should return user context for valid connection", async () => {
      const connectionData = {
        userId: "user-456",
        groups: ["admin", "users"],
        connectedAt: 1234567890,
      };
      ctx.mockRedis.get.mockResolvedValue(JSON.stringify(connectionData));

      const result = await ctx.service.getConnectionUser(TEST_CONNECTION_ID);

      expect(result).toEqual({
        userId: "user-456",
        groups: ["admin", "users"],
      });
    });

    it("should return null for nonexistent connection", async () => {
      ctx.mockRedis.get.mockResolvedValue(null);

      const result = await ctx.service.getConnectionUser("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("removeConnection", () => {
    it("should remove connection and associated subscriptions using index", async () => {
      const connectionId = TEST_CONNECTION_ID;
      const subscriptionData = {
        connectionId,
        subscriptionId: "sub1",
        operationName: "onPostCreated",
        filters: { ownerId: "user-123" },
        registeredAt: 1234567890,
      };

      // Mock smembers to return subscription IDs from connection index
      ctx.mockRedis.smembers.mockResolvedValue(["sub1", "sub2"]);
      // Mock get to return subscription data for trigger cleanup
      ctx.mockRedis.get.mockResolvedValue(JSON.stringify(subscriptionData));

      await ctx.service.removeConnection(connectionId);

      // Verify it uses smembers on the connection-subs index (not KEYS)
      expect(ctx.mockRedis.smembers).toHaveBeenCalledWith(
        `connection-subs:${connectionId}`
      );
      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
      // Verify KEYS was NOT called (the old anti-pattern)
      expect(ctx.mockRedis.keys).not.toHaveBeenCalled();
    });
  });

  describe("registerSubscription", () => {
    it("should store subscription with trigger index", async () => {
      await ctx.service.registerSubscription(
        "connection-123",
        "sub-456",
        "onPostCreated",
        { ownerId: "user-789" }
      );

      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe("getSubscribers", () => {
    it("should return subscriptions matching trigger using mget", async () => {
      const subscriptionData = {
        connectionId: "conn-1",
        subscriptionId: "sub-1",
        operationName: "onPostCreated",
        filters: {},
        registeredAt: 1234567890,
      };

      ctx.mockRedis.smembers.mockResolvedValue(["conn-1:sub-1"]);
      // Use mget mock instead of individual get
      ctx.mockRedis.mget.mockResolvedValue([JSON.stringify(subscriptionData)]);

      const result = await ctx.service.getSubscribers("onPostCreated");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(subscriptionData);
      expect(ctx.mockRedis.mget).toHaveBeenCalledWith(
        "subscription:conn-1:sub-1"
      );
    });

    it("should return empty array when no subscribers", async () => {
      ctx.mockRedis.smembers.mockResolvedValue([]);

      const result = await ctx.service.getSubscribers("onPostCreated");

      expect(result).toEqual([]);
      // mget should not be called when there are no members
      expect(ctx.mockRedis.mget).not.toHaveBeenCalled();
    });

    it("should filter out null values from mget results", async () => {
      const subscriptionData = {
        connectionId: "conn-1",
        subscriptionId: "sub-1",
        operationName: "onPostCreated",
        filters: {},
        registeredAt: 1234567890,
      };

      ctx.mockRedis.smembers.mockResolvedValue([
        "conn-1:sub-1",
        "conn-2:sub-2",
      ]);
      // Second subscription not found (expired/deleted)
      ctx.mockRedis.mget.mockResolvedValue([
        JSON.stringify(subscriptionData),
        null,
      ]);

      const result = await ctx.service.getSubscribers("onPostCreated");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(subscriptionData);
    });
  });

  describe("publish", () => {
    it("should publish message to channel", async () => {
      await ctx.service.publish("test-channel", "test-message");

      expect(ctx.mockRedis.publish).toHaveBeenCalledWith(
        "test-channel",
        "test-message"
      );
    });
  });

  describe("getClient", () => {
    it("should throw when client is not initialized", async () => {
      await ctx.service.onModuleDestroy();

      expect(() => ctx.service.getClient()).toThrow(
        "Valkey client not initialized"
      );
    });

    it("should return the Redis client when initialized", () => {
      const client = ctx.service.getClient();

      expect(client).toBe(ctx.mockRedis);
    });
  });

  describe("onModuleInit retry strategy", () => {
    it("should calculate delay using min(times*50, 2000) formula", () => {
      const redisConstructorCall = (Redis as unknown as Mock).mock.calls[0][0];
      const retryStrategy = redisConstructorCall.retryStrategy;

      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(10)).toBe(500);
      expect(retryStrategy(100)).toBe(2000);
    });

    it("should cap retry delay at 2000ms", () => {
      const redisConstructorCall = (Redis as unknown as Mock).mock.calls[0][0];
      const retryStrategy = redisConstructorCall.retryStrategy;

      expect(retryStrategy(50)).toBe(2000);
      expect(retryStrategy(1000)).toBe(2000);
    });
  });

  describe("onModuleInit event handlers", () => {
    it("should register error and connect event handlers", async () => {
      expect(ctx.mockRedis.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(ctx.mockRedis.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
    });

    it("should log error when error event is emitted", async () => {
      const errorHandlerCall = (ctx.mockRedis.on as Mock).mock.calls.find(
        (call: string[]) => call[0] === "error"
      );
      const errorHandler = errorHandlerCall?.[1];

      const testError = new Error("Connection refused");
      expect(() => errorHandler(testError)).not.toThrow();
    });

    it("should log message when connect event is emitted", async () => {
      const connectHandlerCall = (ctx.mockRedis.on as Mock).mock.calls.find(
        (call: string[]) => call[0] === "connect"
      );
      const connectHandler = connectHandlerCall?.[1];

      expect(() => connectHandler()).not.toThrow();
    });
  });

  describe("removeConnection with subscriptions", () => {
    it("should clean up trigger keys for subscriptions with data", async () => {
      const connectionId = TEST_CONNECTION_ID;
      const subscriptionData = {
        connectionId,
        subscriptionId: "sub1",
        operationName: "onPostCreated",
        filters: { ownerId: "user-123" },
        registeredAt: 1234567890,
      };

      ctx.mockRedis.smembers.mockResolvedValue(["sub1"]);
      // mget is used to batch fetch subscriptions
      ctx.mockRedis.mget.mockResolvedValue([JSON.stringify(subscriptionData)]);

      await ctx.service.removeConnection(connectionId);

      expect(ctx.mockRedis.smembers).toHaveBeenCalledWith(
        `connection-subs:${connectionId}`
      );
      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
    });

    it("should handle subscriptions with null data (already expired)", async () => {
      const connectionId = TEST_CONNECTION_ID;

      ctx.mockRedis.smembers.mockResolvedValue(["sub1", "sub2"]);
      // Return null for both - simulates already expired subscriptions
      ctx.mockRedis.mget.mockResolvedValue([null, null]);

      await ctx.service.removeConnection(connectionId);

      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
    });

    it("should handle connection with no subscriptions", async () => {
      ctx.mockRedis.smembers.mockResolvedValue([]);

      await ctx.service.removeConnection("connection-with-no-subs");

      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe("unregisterSubscription", () => {
    it("should remove subscription when data exists", async () => {
      const connectionId = "conn-123";
      const subscriptionId = "sub-456";
      const subscriptionData = {
        connectionId,
        subscriptionId,
        operationName: "onPostCreated",
        filters: { ownerId: "user-789" },
        registeredAt: 1234567890,
      };

      ctx.mockRedis.get.mockResolvedValue(JSON.stringify(subscriptionData));

      await ctx.service.unregisterSubscription(connectionId, subscriptionId);

      expect(ctx.mockRedis.get).toHaveBeenCalledWith(
        `subscription:${connectionId}:${subscriptionId}`
      );
      expect(ctx.mockRedis.pipeline).toHaveBeenCalled();
    });

    it("should do nothing when subscription data does not exist", async () => {
      ctx.mockRedis.get.mockResolvedValue(null);

      await ctx.service.unregisterSubscription("conn-123", "sub-456");

      expect(ctx.mockRedis.get).toHaveBeenCalled();
      expect(ctx.mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it("should use correct subscription key format", async () => {
      ctx.mockRedis.get.mockResolvedValue(null);

      await ctx.service.unregisterSubscription("my-conn", "my-sub");

      expect(ctx.mockRedis.get).toHaveBeenCalledWith(
        "subscription:my-conn:my-sub"
      );
    });
  });
});
/* eslint-enable max-lines -- Comprehensive ValkeyService tests covering all lifecycle methods, connection operations, subscription management, and error paths require extensive test cases */
