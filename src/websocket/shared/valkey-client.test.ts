/* eslint-disable max-lines -- comprehensive test coverage for shared Valkey client requires extensive test cases */
/**
 * @file valkey-client.test.ts
 * @description Unit tests for the shared Valkey client used by WebSocket Lambda handlers
 * @module websocket/shared
 * @remarks
 * Tests cover the singleton client creation strategy, connection lifecycle
 * (store, retrieve, remove), subscription registration and cleanup, and the
 * batch-retrieval path used to fan out to subscribers. The ioredis client is
 * fully mocked so no real Redis server is required.
 *
 * Singleton note: the module-level `valkeyClient` variable is initialised on
 * the first call to `getValkeyClient()`. Because Jest caches module state,
 * the constructor is called exactly once across the entire test suite rather
 * than once per test. Constructor-arg assertions use a `beforeAll` snapshot
 * captured before any `clearAllMocks` calls wipe the call history.
 */

import { vi, expect, type Mock } from "vitest";
import Redis from "ioredis";

const { mockPipeline, mockRedisInstance } = vi.hoisted(() => {
  const pipeline = {
    del: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    setex: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };

  const redisInstance = {
    get: vi.fn(),
    setex: vi.fn(),
    smembers: vi.fn(),
    mget: vi.fn(),
    pipeline: vi.fn().mockReturnValue(pipeline),
    on: vi.fn(),
  };

  return { mockPipeline: pipeline, mockRedisInstance: redisInstance };
});

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(function () {
    return mockRedisInstance;
  }),
}));
vi.mock("../../config/configuration", () => ({
  configuration: vi.fn().mockReturnValue({
    valkey: { host: "localhost", port: 6379, maxRetriesPerRequest: 3 },
  }),
}));

const MockRedis = Redis as unknown as Mock;
import {
  getValkeyClient,
  setConnection,
  getConnection,
  removeConnection,
  registerSubscription,
  unregisterSubscription,
  getSubscribers,
} from "./valkey-client";
import {
  CONNECTION_PREFIX,
  CONNECTION_SUBS_PREFIX,
  CONNECTION_TTL_SECONDS,
  SUBSCRIPTION_PREFIX,
  buildTriggerKey,
} from "../../valkey/valkey.interface";

/** Sample connection ID reused across tests */
const CONN_ID = "conn-test-123";

/** Sample subscription ID reused across tests */
const SUB_ID = "sub-abc";

/** Sample operation name */
const OP_NAME = "onPostCreated";

/**
 * Resets pipeline mocks to their default chaining/resolved state.
 * Called from `beforeEach` so each test starts with a clean pipeline.
 */
const resetPipelineMocks = (): void => {
  mockPipeline.del.mockReset().mockReturnThis();
  mockPipeline.srem.mockReset().mockReturnThis();
  mockPipeline.sadd.mockReset().mockReturnThis();
  mockPipeline.setex.mockReset().mockReturnThis();
  mockPipeline.expire.mockReset().mockReturnThis();
  mockPipeline.exec.mockReset().mockResolvedValue([]);
  mockRedisInstance.pipeline.mockReturnValue(mockPipeline);
};

describe("valkey-client", () => {
  /**
   * Snapshot of the Redis constructor call arguments captured in `beforeAll`,
   * before any `clearAllMocks` calls can wipe the history. The singleton is
   * initialised when the module is first imported, so by `beforeAll` the
   * constructor has already run.
   */
  let capturedConstructorArgs: Record<string, unknown>;
  let capturedOnCalls: Array<[string, (...args: unknown[]) => void]>;

  beforeAll(() => {
    // Trigger singleton init by calling getValkeyClient once
    getValkeyClient();

    capturedConstructorArgs = MockRedis.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    capturedOnCalls = (mockRedisInstance.on as Mock).mock.calls as Array<
      [string, (...args: unknown[]) => void]
    >;
  });

  beforeEach(() => {
    mockRedisInstance.get.mockReset();
    mockRedisInstance.setex.mockReset();
    mockRedisInstance.smembers.mockReset();
    mockRedisInstance.mget.mockReset();
    resetPipelineMocks();
    // Do NOT clear MockRedis or mockRedisInstance.on — their call history is
    // used by the getValkeyClient tests via the snapshot captured in beforeAll.
  });

  describe("getValkeyClient", () => {
    it("creates a Redis client with configuration values on first call", () => {
      expect(capturedConstructorArgs).toMatchObject({
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: 3,
      });
    });

    it("reuses the existing client on subsequent calls (singleton)", () => {
      const callCountBefore = MockRedis.mock.calls.length;

      const first = getValkeyClient();
      const second = getValkeyClient();

      expect(first).toBe(second);
      // Constructor must not have been called again
      expect(MockRedis.mock.calls).toHaveLength(callCountBefore);
    });

    it("registers an error listener on the client during initialisation", () => {
      const errorCall = capturedOnCalls.find(([event]) => event === "error");
      expect(errorCall).toBeDefined();
      expect(typeof errorCall?.[1]).toBe("function");
    });

    it("retryStrategy returns exponential delay capped at 2000ms", () => {
      const retryStrategy = capturedConstructorArgs.retryStrategy as (
        times: number
      ) => number;

      expect(typeof retryStrategy).toBe("function");
      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(10)).toBe(500);
      // Cap kicks in at times >= 40 → 40 * 50 = 2000
      expect(retryStrategy(100)).toBe(2000);
    });
  });

  describe("setConnection", () => {
    it("serializes connection data and stores it with the configured TTL", async () => {
      mockRedisInstance.setex.mockResolvedValueOnce("OK");

      const data = {
        userId: "user-1",
        groups: ["admin", "users"] as readonly string[],
        connectedAt: 1234567890,
      };

      await setConnection(CONN_ID, data);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `${CONNECTION_PREFIX}${CONN_ID}`,
        CONNECTION_TTL_SECONDS,
        JSON.stringify({ ...data, groups: [...data.groups] })
      );
    });
  });

  describe("getConnection", () => {
    it("returns parsed connection data when the key exists", async () => {
      const stored = {
        userId: "user-1",
        groups: ["admin"],
        connectedAt: 1234567890,
      };
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(stored));

      const result = await getConnection(CONN_ID);

      expect(result).toEqual(stored);
      expect(mockRedisInstance.get).toHaveBeenCalledWith(
        `${CONNECTION_PREFIX}${CONN_ID}`
      );
    });

    it("returns null when the key does not exist", async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);

      const result = await getConnection(CONN_ID);

      expect(result).toBeNull();
    });
  });

  describe("removeConnection", () => {
    it("deletes connection and subscription keys when subscriptions exist", async () => {
      const subscriptionData = {
        connectionId: CONN_ID,
        subscriptionId: SUB_ID,
        operationName: OP_NAME,
        filters: { resourceId: "res-1" },
        registeredAt: 1234567890,
      };
      mockRedisInstance.smembers.mockResolvedValueOnce([SUB_ID]);
      mockRedisInstance.mget.mockResolvedValueOnce([
        JSON.stringify(subscriptionData),
      ]);

      await removeConnection(CONN_ID);

      const connectionKey = `${CONNECTION_PREFIX}${CONN_ID}`;
      const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${CONN_ID}`;
      const subKey = `${SUBSCRIPTION_PREFIX}${CONN_ID}:${SUB_ID}`;
      const triggerKey = buildTriggerKey(OP_NAME, { resourceId: "res-1" });

      expect(mockPipeline.del).toHaveBeenCalledWith(connectionKey);
      expect(mockPipeline.del).toHaveBeenCalledWith(connectionSubsKey);
      expect(mockPipeline.srem).toHaveBeenCalledWith(
        triggerKey,
        `${CONN_ID}:${SUB_ID}`
      );
      expect(mockPipeline.del).toHaveBeenCalledWith(subKey);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it("deletes connection keys only when no subscriptions exist", async () => {
      mockRedisInstance.smembers.mockResolvedValueOnce([]);

      await removeConnection(CONN_ID);

      // mget should not be called when there are no subscription IDs
      expect(mockRedisInstance.mget).not.toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledWith(
        `${CONNECTION_PREFIX}${CONN_ID}`
      );
      expect(mockPipeline.del).toHaveBeenCalledWith(
        `${CONNECTION_SUBS_PREFIX}${CONN_ID}`
      );
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it("skips srem for null entries in mget result but still deletes the sub key", async () => {
      mockRedisInstance.smembers.mockResolvedValueOnce([SUB_ID]);
      // mget returns null — the subscription key expired or was already deleted
      mockRedisInstance.mget.mockResolvedValueOnce([null]);

      await removeConnection(CONN_ID);

      // srem should NOT be called since there's no data to parse
      expect(mockPipeline.srem).not.toHaveBeenCalled();
      // del for the subscription key should still be called
      expect(mockPipeline.del).toHaveBeenCalledWith(
        `${SUBSCRIPTION_PREFIX}${CONN_ID}:${SUB_ID}`
      );
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe("registerSubscription", () => {
    it("stores subscription data and updates all index keys via pipeline", async () => {
      const filters = { ownerId: "user-99" };

      await registerSubscription(CONN_ID, SUB_ID, OP_NAME, filters);

      const subKey = `${SUBSCRIPTION_PREFIX}${CONN_ID}:${SUB_ID}`;
      const triggerKey = buildTriggerKey(OP_NAME, filters);
      const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${CONN_ID}`;

      expect(mockPipeline.setex).toHaveBeenCalledWith(
        subKey,
        CONNECTION_TTL_SECONDS,
        expect.stringContaining(OP_NAME)
      );
      expect(mockPipeline.sadd).toHaveBeenCalledWith(
        triggerKey,
        `${CONN_ID}:${SUB_ID}`
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        triggerKey,
        CONNECTION_TTL_SECONDS
      );
      expect(mockPipeline.sadd).toHaveBeenCalledWith(connectionSubsKey, SUB_ID);
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        connectionSubsKey,
        CONNECTION_TTL_SECONDS
      );
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it("uses empty filters when none are provided", async () => {
      await registerSubscription(CONN_ID, SUB_ID, OP_NAME);

      const triggerKey = buildTriggerKey(OP_NAME, {});

      expect(mockPipeline.sadd).toHaveBeenCalledWith(
        triggerKey,
        `${CONN_ID}:${SUB_ID}`
      );
    });
  });

  describe("unregisterSubscription", () => {
    it("removes subscription and updates indexes when subscription data exists", async () => {
      const subscriptionData = {
        connectionId: CONN_ID,
        subscriptionId: SUB_ID,
        operationName: OP_NAME,
        filters: {},
        registeredAt: 1234567890,
      };
      mockRedisInstance.get.mockResolvedValueOnce(
        JSON.stringify(subscriptionData)
      );

      await unregisterSubscription(CONN_ID, SUB_ID);

      const subKey = `${SUBSCRIPTION_PREFIX}${CONN_ID}:${SUB_ID}`;
      const triggerKey = buildTriggerKey(OP_NAME, {});
      const connectionSubsKey = `${CONNECTION_SUBS_PREFIX}${CONN_ID}`;

      expect(mockPipeline.del).toHaveBeenCalledWith(subKey);
      expect(mockPipeline.srem).toHaveBeenCalledWith(
        triggerKey,
        `${CONN_ID}:${SUB_ID}`
      );
      expect(mockPipeline.srem).toHaveBeenCalledWith(connectionSubsKey, SUB_ID);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it("does nothing when subscription data is not found", async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);

      await unregisterSubscription(CONN_ID, SUB_ID);

      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });
  });

  describe("getSubscribers", () => {
    it("returns an empty array when there are no members for the trigger", async () => {
      mockRedisInstance.smembers.mockResolvedValueOnce([]);

      const result = await getSubscribers(OP_NAME);

      expect(result).toEqual([]);
      expect(mockRedisInstance.mget).not.toHaveBeenCalled();
    });

    it("returns parsed subscription data for all members", async () => {
      const member = `${CONN_ID}:${SUB_ID}`;
      const subscriptionData = {
        connectionId: CONN_ID,
        subscriptionId: SUB_ID,
        operationName: OP_NAME,
        filters: {},
        registeredAt: 1234567890,
      };

      mockRedisInstance.smembers.mockResolvedValueOnce([member]);
      mockRedisInstance.mget.mockResolvedValueOnce([
        JSON.stringify(subscriptionData),
      ]);

      const result = await getSubscribers(OP_NAME);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(subscriptionData);
    });

    it("filters out null results from mget when subscription keys have expired", async () => {
      const member1 = `${CONN_ID}:sub-1`;
      const member2 = `${CONN_ID}:sub-2`;
      const liveData = {
        connectionId: CONN_ID,
        subscriptionId: "sub-1",
        operationName: OP_NAME,
        filters: {},
        registeredAt: 1234567890,
      };

      mockRedisInstance.smembers.mockResolvedValueOnce([member1, member2]);
      // sub-2 returns null (expired)
      mockRedisInstance.mget.mockResolvedValueOnce([
        JSON.stringify(liveData),
        null,
      ]);

      const result = await getSubscribers(OP_NAME);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(liveData);
    });
  });
});
/* eslint-enable max-lines -- end of comprehensive Valkey client test coverage */
