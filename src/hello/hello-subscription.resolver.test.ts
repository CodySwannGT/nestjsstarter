/**
 * @file hello-subscription.resolver.test.ts
 * @description Unit tests for HelloSubscriptionResolver
 * @module hello
 * @remarks
 * Tests verify that subscription methods return async iterators and
 * that the resolver correctly delegates to ValkeyPubSub.
 */

import { vi, expect, Mocked } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { HelloSubscriptionResolver } from "./hello-subscription.resolver";
import { ValkeyPubSub } from "../subscription/pubsub/valkey-pubsub";
import { PUB_SUB } from "../subscription/subscription.module";

/**
 * Test context interface for HelloSubscriptionResolver tests
 */
interface TestContext {
  module: TestingModule;
  resolver: HelloSubscriptionResolver;
  mockPubSub: Mocked<ValkeyPubSub>;
}

/**
 * Creates a mock async iterator for testing subscription returns
 * @returns Mock AsyncIterator
 */
const createMockAsyncIterator = (): AsyncIterator<string> => ({
  next: vi.fn().mockReturnValue(new Promise(() => {})),
  return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
  throw: vi.fn().mockRejectedValue(new Error("throw called")),
});

/**
 * Creates a mock ValkeyPubSub instance
 * @returns Mocked ValkeyPubSub
 */
const createMockPubSub = (): Mocked<ValkeyPubSub> =>
  ({
    asyncIterator: vi.fn().mockReturnValue(createMockAsyncIterator()),
    publishCreated: vi.fn().mockResolvedValue(undefined),
    publishUpdated: vi.fn().mockResolvedValue(undefined),
    publishDeleted: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Mocked<ValkeyPubSub>;

describe("HelloSubscriptionResolver", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    ctx.mockPubSub = createMockPubSub();

    ctx.module = await Test.createTestingModule({
      providers: [
        HelloSubscriptionResolver,
        {
          provide: PUB_SUB,
          useValue: ctx.mockPubSub,
        },
      ],
    }).compile();

    ctx.resolver = ctx.module.get<HelloSubscriptionResolver>(
      HelloSubscriptionResolver
    );
  });

  afterEach(async () => {
    await ctx.module.close();
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(ctx.resolver).toBeDefined();
  });

  describe("onHelloCreated", () => {
    it("should return an async iterator for the created trigger", () => {
      const iterator = ctx.resolver.onHelloCreated();

      expect(iterator).toBeDefined();
      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloCreated"
      );
    });

    it("should use the correct trigger name", () => {
      ctx.resolver.onHelloCreated();

      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloCreated"
      );
      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });

  describe("onHelloUpdated", () => {
    it("should return an async iterator for the updated trigger", () => {
      const iterator = ctx.resolver.onHelloUpdated();

      expect(iterator).toBeDefined();
      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloUpdated"
      );
    });

    it("should accept an optional ownerId argument", () => {
      ctx.resolver.onHelloUpdated("user-123");

      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloUpdated"
      );
    });

    it("should work without ownerId argument", () => {
      ctx.resolver.onHelloUpdated();

      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloUpdated"
      );
    });
  });

  describe("onHelloDeleted", () => {
    it("should return an async iterator for the deleted trigger", () => {
      const iterator = ctx.resolver.onHelloDeleted();

      expect(iterator).toBeDefined();
      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloDeleted"
      );
    });

    it("should use the correct trigger name", () => {
      ctx.resolver.onHelloDeleted();

      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledWith(
        "onHelloDeleted"
      );
      expect(ctx.mockPubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });
});
