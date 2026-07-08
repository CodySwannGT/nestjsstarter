/**
 * @file subscription.integration.test.ts
 * @description Integration tests for GraphQL subscriptions
 * @module subscription
 * @remarks
 * These tests require a running Valkey instance.
 * Run `docker-compose up -d` before executing these tests.
 * Tests are excluded from unit test runs via --testPathIgnorePatterns.
 */

import { expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "../config/config.module";
import { ValkeyService } from "../valkey/valkey.service";
import { ValkeyModule } from "../valkey/valkey.module";
import { ValkeyPubSub } from "./pubsub/valkey-pubsub";
import { SubscriptionModule, PUB_SUB } from "./subscription.module";

/**
 * Test context interface
 */
interface TestContext {
  module: TestingModule;
  valkeyService: ValkeyService;
  pubSub: ValkeyPubSub;
}

/**
 * Checks if Valkey is available
 * @returns True if Valkey is running
 * @remarks Uses finally block to ensure client cleanup even if ping fails
 */
const isValkeyAvailable = async (): Promise<boolean> => {
  let client: InstanceType<typeof import("ioredis").default> | null = null;
  try {
    const Redis = (await import("ioredis")).default;
    client = new Redis({
      host: process.env.VALKEY_HOST ?? "localhost",
      port: parseInt(process.env.VALKEY_PORT ?? "6379", 10),
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
    });
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    if (client) {
      await client.quit().catch(() => {});
    }
  }
};

/**
 * Cleans up test data from Valkey
 * @remarks Uses KEYS pattern matching which is acceptable for testing
 */
const cleanupTestData = async (): Promise<void> => {
  const Redis = (await import("ioredis")).default;
  const client = new Redis({
    host: process.env.VALKEY_HOST ?? "localhost",
    port: parseInt(process.env.VALKEY_PORT ?? "6379", 10),
  });

  try {
    // Clean up test connections and subscriptions using pattern matching
    const patterns = [
      "connection:test-*",
      "connection:conn-*",
      "subscription:test-*",
      "subscription:conn-*",
      "connection-subs:test-*",
      "connection-subs:conn-*",
      "trigger:onPostCreated:*",
      "trigger:onPostDeleted:*",
      "trigger:onItemCreated:*",
    ];

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }
  } finally {
    await client.quit();
  }
};

describe("Subscription Integration Tests", () => {
  const ctx: TestContext = {} as TestContext;
  const isAvailable = { value: false };

  beforeAll(async () => {
    isAvailable.value = await isValkeyAvailable();

    if (!isAvailable.value) {
      console.warn(
        "Skipping integration tests: Valkey not available. Run docker-compose up -d"
      );
      return;
    }

    // Clean up any leftover test data from previous runs
    await cleanupTestData();

    ctx.module = await Test.createTestingModule({
      // ConfigModule is global in the real app; isolated testing modules
      // must provide it explicitly for ValkeyService's ConfigService
      imports: [ConfigModule, ValkeyModule, SubscriptionModule],
    }).compile();

    await ctx.module.init();
    ctx.valkeyService = ctx.module.get<ValkeyService>(ValkeyService);
    ctx.pubSub = ctx.module.get<ValkeyPubSub>(PUB_SUB);
  });

  afterAll(async () => {
    if (ctx.module) {
      await ctx.module.close();
    }
  });

  describe("connection lifecycle", () => {
    it("should store and retrieve connection data", async () => {
      if (!isAvailable.value) return;

      const connectionId = `test-${Date.now()}`;
      const connectionData = {
        userId: "user-123",
        groups: ["admin"],
        connectedAt: Date.now(),
      };

      await ctx.valkeyService.setConnection(connectionId, connectionData);

      const retrieved = await ctx.valkeyService.getConnection(connectionId);
      expect(retrieved).toEqual(connectionData);

      // Cleanup
      await ctx.valkeyService.removeConnection(connectionId);
    });

    it("should remove connection and associated data", async () => {
      if (!isAvailable.value) return;

      const connectionId = `test-${Date.now()}`;
      await ctx.valkeyService.setConnection(connectionId, {
        userId: "user-123",
        groups: [],
        connectedAt: Date.now(),
      });

      await ctx.valkeyService.removeConnection(connectionId);

      const retrieved = await ctx.valkeyService.getConnection(connectionId);
      expect(retrieved).toBeNull();
    });
  });

  describe("subscription registration", () => {
    it("should register and retrieve subscription", async () => {
      if (!isAvailable.value) return;

      const connectionId = `conn-${Date.now()}`;
      const subscriptionId = "sub-123";

      // Setup connection first
      await ctx.valkeyService.setConnection(connectionId, {
        userId: "user-123",
        groups: [],
        connectedAt: Date.now(),
      });

      // Register subscription
      await ctx.valkeyService.registerSubscription(
        connectionId,
        subscriptionId,
        "onPostCreated",
        { ownerId: "user-123" }
      );

      // Retrieve subscribers
      const subscribers = await ctx.valkeyService.getSubscribers(
        "onPostCreated",
        { ownerId: "user-123" }
      );

      expect(subscribers).toHaveLength(1);
      expect(subscribers[0]).toEqual(
        expect.objectContaining({
          connectionId,
          subscriptionId,
          operationName: "onPostCreated",
        })
      );

      // Cleanup
      await ctx.valkeyService.removeConnection(connectionId);
    });

    it("should unregister subscription", async () => {
      if (!isAvailable.value) return;

      const connectionId = `conn-${Date.now()}`;
      const subscriptionId = "sub-456";

      await ctx.valkeyService.setConnection(connectionId, {
        userId: "user-123",
        groups: [],
        connectedAt: Date.now(),
      });

      await ctx.valkeyService.registerSubscription(
        connectionId,
        subscriptionId,
        "onPostDeleted",
        {}
      );

      // Verify registration

      let subscribers = await ctx.valkeyService.getSubscribers("onPostDeleted");
      expect(subscribers.length).toBeGreaterThan(0);

      // Unregister
      await ctx.valkeyService.unregisterSubscription(
        connectionId,
        subscriptionId
      );

      // Verify unregistration
      subscribers = await ctx.valkeyService.getSubscribers("onPostDeleted");
      const found = subscribers.find(s => s.subscriptionId === subscriptionId);
      expect(found).toBeUndefined();

      // Cleanup
      await ctx.valkeyService.removeConnection(connectionId);
    });
  });

  describe("user context", () => {
    it("should retrieve user context for connection", async () => {
      if (!isAvailable.value) return;

      const connectionId = `conn-${Date.now()}`;
      const connectionData = {
        userId: "user-789",
        groups: ["admin", "moderator"],
        connectedAt: Date.now(),
      };

      await ctx.valkeyService.setConnection(connectionId, connectionData);

      const userContext =
        await ctx.valkeyService.getConnectionUser(connectionId);

      expect(userContext).toEqual({
        userId: "user-789",
        groups: ["admin", "moderator"],
      });

      // Cleanup
      await ctx.valkeyService.removeConnection(connectionId);
    });

    it("should return null for nonexistent connection", async () => {
      if (!isAvailable.value) return;

      const userContext =
        await ctx.valkeyService.getConnectionUser("nonexistent-conn");
      expect(userContext).toBeNull();
    });
  });

  describe("filtering", () => {
    it("should filter subscriptions by ownerId", async () => {
      if (!isAvailable.value) return;

      const connectionId1 = `conn-owner1-${Date.now()}`;
      const connectionId2 = `conn-owner2-${Date.now()}`;

      // Setup connections
      await ctx.valkeyService.setConnection(connectionId1, {
        userId: "owner-1",
        groups: [],
        connectedAt: Date.now(),
      });
      await ctx.valkeyService.setConnection(connectionId2, {
        userId: "owner-2",
        groups: [],
        connectedAt: Date.now(),
      });

      // Register subscriptions with different owners
      await ctx.valkeyService.registerSubscription(
        connectionId1,
        "sub-1",
        "onItemCreated",
        { ownerId: "owner-1" }
      );
      await ctx.valkeyService.registerSubscription(
        connectionId2,
        "sub-2",
        "onItemCreated",
        { ownerId: "owner-2" }
      );

      // Query for specific owner
      const owner1Subs = await ctx.valkeyService.getSubscribers(
        "onItemCreated",
        { ownerId: "owner-1" }
      );
      expect(owner1Subs).toHaveLength(1);
      expect(owner1Subs[0].connectionId).toBe(connectionId1);

      const owner2Subs = await ctx.valkeyService.getSubscribers(
        "onItemCreated",
        { ownerId: "owner-2" }
      );
      expect(owner2Subs).toHaveLength(1);
      expect(owner2Subs[0].connectionId).toBe(connectionId2);

      // Cleanup
      await ctx.valkeyService.removeConnection(connectionId1);
      await ctx.valkeyService.removeConnection(connectionId2);
    });
  });
});
