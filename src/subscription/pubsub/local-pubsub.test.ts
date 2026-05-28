/**
 * @file local-pubsub.test.ts
 * @description Unit tests for LocalPubSub service
 * @module subscription/pubsub
 */

import { vi, expect, MockInstance } from "vitest";
import { PubSub } from "graphql-subscriptions";
import { LocalPubSub } from "./local-pubsub";

/**
 * Test context interface
 */
interface TestContext {
  localPubSub: LocalPubSub;
  publishSpy: MockInstance;
}

/** Test constants */
const TEST_RESOURCE_TYPE = "User";
const TEST_DATA = { id: "user-123", name: "Test User" };

/** Trigger name constants */
const TRIGGER_ON_USER_CREATED = "onUserCreated";
const TRIGGER_ON_USER_UPDATED = "onUserUpdated";
const TRIGGER_ON_USER_DELETED = "onUserDeleted";

/** Payload key constants */
const PAYLOAD_USER_CREATED = "userCreated";
const PAYLOAD_USER_UPDATED = "userUpdated";
const PAYLOAD_USER_DELETED = "userDeleted";

/**
 * Creates test context for LocalPubSub tests
 * @returns Fresh test context with LocalPubSub instance and publish spy
 */
function createTestContext(): TestContext {
  const localPubSub = new LocalPubSub();
  const publishSpy = vi.spyOn(PubSub.prototype, "publish");

  return {
    localPubSub,
    publishSpy,
  };
}

describe("LocalPubSub", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should be defined", () => {
    const ctx = createTestContext();
    expect(ctx.localPubSub).toBeDefined();
  });

  it("should extend PubSub from graphql-subscriptions", () => {
    const ctx = createTestContext();
    expect(ctx.localPubSub).toBeInstanceOf(PubSub);
  });

  describe("publishCreated", () => {
    it("should publish created event with onResourceCreated trigger name", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishCreated(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(
        TRIGGER_ON_USER_CREATED,
        expect.any(Object)
      );
    });

    it("should include data in resourceCreated payload key", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishCreated(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(expect.any(String), {
        [PAYLOAD_USER_CREATED]: TEST_DATA,
      });
    });

    it("should accept ownerId filter for created events", async () => {
      const ctx = createTestContext();
      const filters = { ownerId: "owner-123" };

      await ctx.localPubSub.publishCreated(
        TEST_RESOURCE_TYPE,
        TEST_DATA,
        filters
      );

      expect(ctx.publishSpy).toHaveBeenCalledWith(TRIGGER_ON_USER_CREATED, {
        [PAYLOAD_USER_CREATED]: TEST_DATA,
      });
    });
  });

  describe("publishUpdated", () => {
    it("should publish updated event with onResourceUpdated trigger name", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishUpdated(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(
        TRIGGER_ON_USER_UPDATED,
        expect.any(Object)
      );
    });

    it("should include data in resourceUpdated payload key", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishUpdated(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(expect.any(String), {
        [PAYLOAD_USER_UPDATED]: TEST_DATA,
      });
    });

    it("should accept resourceId filter for updated events", async () => {
      const ctx = createTestContext();
      const filters = { resourceId: "resource-456" };

      await ctx.localPubSub.publishUpdated(
        TEST_RESOURCE_TYPE,
        TEST_DATA,
        filters
      );

      expect(ctx.publishSpy).toHaveBeenCalledWith(TRIGGER_ON_USER_UPDATED, {
        [PAYLOAD_USER_UPDATED]: TEST_DATA,
      });
    });
  });

  describe("publishDeleted", () => {
    it("should publish deleted event with onResourceDeleted trigger name", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishDeleted(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(
        TRIGGER_ON_USER_DELETED,
        expect.any(Object)
      );
    });

    it("should include data in resourceDeleted payload key", async () => {
      const ctx = createTestContext();
      await ctx.localPubSub.publishDeleted(TEST_RESOURCE_TYPE, TEST_DATA);

      expect(ctx.publishSpy).toHaveBeenCalledWith(expect.any(String), {
        [PAYLOAD_USER_DELETED]: TEST_DATA,
      });
    });

    it("should accept organizationId filter for deleted events", async () => {
      const ctx = createTestContext();
      const filters = { organizationId: "org-789" };

      await ctx.localPubSub.publishDeleted(
        TEST_RESOURCE_TYPE,
        TEST_DATA,
        filters
      );

      expect(ctx.publishSpy).toHaveBeenCalledWith(TRIGGER_ON_USER_DELETED, {
        [PAYLOAD_USER_DELETED]: TEST_DATA,
      });
    });
  });

  describe("asyncIterator", () => {
    it("should return async iterator from parent class", () => {
      const ctx = createTestContext();
      const iterator = ctx.localPubSub.asyncIterator(TRIGGER_ON_USER_CREATED);

      expect(iterator).toBeDefined();
      expect(typeof iterator.next).toBe("function");
      expect(typeof iterator.return).toBe("function");
      expect(typeof iterator.throw).toBe("function");
    });

    it("should return working async iterator that can receive messages", async () => {
      // Create a fresh PubSub without spy to avoid interference
      const pubSub = new LocalPubSub();
      const iterator = pubSub.asyncIterator<{
        [PAYLOAD_USER_CREATED]: typeof TEST_DATA;
      }>(TRIGGER_ON_USER_CREATED);

      // Start listening before publishing to avoid race condition
      const resultPromise = iterator.next();

      // Use setImmediate to ensure subscription is established before publish
      await new Promise(resolve => setImmediate(resolve));

      // Publish a message
      await pubSub.publishCreated(TEST_RESOURCE_TYPE, TEST_DATA);

      // Get the result
      const result = await resultPromise;

      expect(result.done).toBe(false);
      expect(result.value).toEqual({ [PAYLOAD_USER_CREATED]: TEST_DATA });
    });
  });
});
