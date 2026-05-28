/**
 * @file base-subscription.resolver.test.ts
 * @description Unit tests for BaseSubscriptionResolver abstract class
 * @module subscription
 * @remarks
 * Tests verify trigger name generation and publish delegation to ValkeyPubSub.
 * A concrete subclass is used to exercise the abstract class behavior.
 */

import { vi, expect, Mocked } from "vitest";
import { ValkeyPubSub } from "./pubsub/valkey-pubsub";
import { BaseSubscriptionResolver } from "./base-subscription.resolver";
import { PUB_SUB } from "./subscription.module";
import { SubscriptionFilters } from "../valkey/valkey.interface";

/**
 * Concrete implementation of BaseSubscriptionResolver for testing
 */
class TestSubscriptionResolver extends BaseSubscriptionResolver<{
  id: string;
}> {
  /**
   * Creates a TestSubscriptionResolver instance
   * @param pubSub - PubSub service for subscription events
   */
  constructor(pubSub: ValkeyPubSub) {
    super(pubSub, "TestEntity");
  }

  /**
   * Exposes getCreatedTrigger for testing
   * @returns Created trigger name
   */
  getCreatedTriggerPublic(): string {
    return this.getCreatedTrigger();
  }

  /**
   * Exposes getUpdatedTrigger for testing
   * @returns Updated trigger name
   */
  getUpdatedTriggerPublic(): string {
    return this.getUpdatedTrigger();
  }

  /**
   * Exposes getDeletedTrigger for testing
   * @returns Deleted trigger name
   */
  getDeletedTriggerPublic(): string {
    return this.getDeletedTrigger();
  }
}

/**
 * Creates a mock ValkeyPubSub instance
 * @returns Mocked ValkeyPubSub
 */
const createMockPubSub = (): Mocked<ValkeyPubSub> =>
  ({
    publishCreated: vi.fn().mockResolvedValue(undefined),
    publishUpdated: vi.fn().mockResolvedValue(undefined),
    publishDeleted: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    asyncIterator: vi.fn(),
  }) as unknown as Mocked<ValkeyPubSub>;

/** Test constant for entity name */
const ENTITY_NAME = "TestEntity";

describe("BaseSubscriptionResolver", () => {
  let mockPubSub: Mocked<ValkeyPubSub>;
  let resolver: TestSubscriptionResolver;

  beforeEach(() => {
    mockPubSub = createMockPubSub();
    // Provide PUB_SUB token via reflect metadata (as @Inject would)
    Reflect.defineMetadata(
      "self:paramtypes",
      [PUB_SUB],
      TestSubscriptionResolver
    );
    resolver = new TestSubscriptionResolver(mockPubSub);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("trigger name generation", () => {
    it("should return correct created trigger name", () => {
      expect(resolver.getCreatedTriggerPublic()).toBe(
        `on${ENTITY_NAME}Created`
      );
    });

    it("should return correct updated trigger name", () => {
      expect(resolver.getUpdatedTriggerPublic()).toBe(
        `on${ENTITY_NAME}Updated`
      );
    });

    it("should return correct deleted trigger name", () => {
      expect(resolver.getDeletedTriggerPublic()).toBe(
        `on${ENTITY_NAME}Deleted`
      );
    });
  });

  describe("publishCreated", () => {
    it("should delegate to pubSub.publishCreated with entity name and entity", async () => {
      const entity = { id: "123" };
      await resolver.publishCreated(entity);

      expect(mockPubSub.publishCreated).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        {}
      );
    });

    it("should pass filters to pubSub.publishCreated", async () => {
      const entity = { id: "456" };
      const filters: SubscriptionFilters = { ownerId: "user-123" };
      await resolver.publishCreated(entity, filters);

      expect(mockPubSub.publishCreated).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        filters
      );
    });

    it("should use empty filters when not provided", async () => {
      const entity = { id: "789" };
      await resolver.publishCreated(entity);

      expect(mockPubSub.publishCreated).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        {}
      );
    });
  });

  describe("publishUpdated", () => {
    it("should delegate to pubSub.publishUpdated with entity name and entity", async () => {
      const entity = { id: "123" };
      await resolver.publishUpdated(entity);

      expect(mockPubSub.publishUpdated).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        {}
      );
    });

    it("should pass filters to pubSub.publishUpdated", async () => {
      const entity = { id: "456" };
      const filters: SubscriptionFilters = { ownerId: "user-789" };
      await resolver.publishUpdated(entity, filters);

      expect(mockPubSub.publishUpdated).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        filters
      );
    });
  });

  describe("publishDeleted", () => {
    it("should delegate to pubSub.publishDeleted with entity name and entity", async () => {
      const entity = { id: "123" };
      await resolver.publishDeleted(entity);

      expect(mockPubSub.publishDeleted).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        {}
      );
    });

    it("should pass filters to pubSub.publishDeleted", async () => {
      const entity = { id: "999" };
      const filters: SubscriptionFilters = { ownerId: "owner-abc" };
      await resolver.publishDeleted(entity, filters);

      expect(mockPubSub.publishDeleted).toHaveBeenCalledWith(
        ENTITY_NAME,
        entity,
        filters
      );
    });
  });
});
