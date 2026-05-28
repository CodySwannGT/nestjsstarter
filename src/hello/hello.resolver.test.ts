import { vi, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { HelloResolver } from "./hello.resolver";
import { HelloService } from "./hello.service";
import DataLoader from "dataloader";

/**
 * Test context interface for HelloResolver tests
 */
interface TestContext {
  module: TestingModule;
  resolver: HelloResolver;
}

describe("HelloResolver", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    ctx.module = await Test.createTestingModule({
      providers: [HelloResolver, HelloService],
    }).compile();

    ctx.resolver = ctx.module.get<HelloResolver>(HelloResolver);
  });

  afterEach(async () => {
    await ctx.module.close();
  });

  describe("hello query", () => {
    it("should return 'Hello World'", () => {
      expect(ctx.resolver.hello()).toBe("Hello World");
    });
  });

  describe("greet mutation", () => {
    it("should return greeting with name", () => {
      expect(ctx.resolver.greet("Claude")).toBe("Hello, Claude!");
    });
  });

  describe("greetBatched query", () => {
    it("should use the greetingsLoader to batch load the greeting", async () => {
      const mockLoader = {
        load: vi.fn().mockResolvedValue("Hello, BatchedUser!"),
      } as unknown as DataLoader<string, string>;

      const context = {
        loaders: {
          greetingsLoader: mockLoader,
        },
      };

      const result = await ctx.resolver.greetBatched("BatchedUser", context);

      expect(result).toBe("Hello, BatchedUser!");
      expect(mockLoader.load).toHaveBeenCalledWith("BatchedUser");
    });

    it("should pass the name to the loader", async () => {
      const mockLoader = {
        load: vi.fn().mockResolvedValue("Hello, TestName!"),
      } as unknown as DataLoader<string, string>;

      const context = {
        loaders: {
          greetingsLoader: mockLoader,
        },
      };

      await ctx.resolver.greetBatched("TestName", context);

      expect(mockLoader.load).toHaveBeenCalledWith("TestName");
      expect(mockLoader.load).toHaveBeenCalledTimes(1);
    });
  });

  describe("auth decorators", () => {
    /**
     * Note: Auth decorator presence is verified at schema build time by
     * the combinedAuthTransformer. If decorators are missing, schema
     * building will throw MISSING_AUTH error.
     * This test suite verifies the resolver still works after adding decorators.
     */
    it("resolver should still function with auth decorators applied", () => {
      // Verify decorators don't break basic functionality
      expect(ctx.resolver.hello()).toBe("Hello World");
      expect(ctx.resolver.greet("Test")).toBe("Hello, Test!");
    });
  });
});
