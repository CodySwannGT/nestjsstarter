import { expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { HelloService } from "./hello.service";

/**
 * Test context interface for HelloService tests
 */
interface TestContext {
  module: TestingModule;
  service: HelloService;
}

describe("HelloService", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    ctx.module = await Test.createTestingModule({
      providers: [HelloService],
    }).compile();

    ctx.service = ctx.module.get<HelloService>(HelloService);
  });

  afterEach(async () => {
    await ctx.module.close();
  });

  describe("getHello", () => {
    it("should return 'Hello World'", () => {
      expect(ctx.service.getHello()).toBe("Hello World");
    });
  });

  describe("greet", () => {
    it("should return personalized greeting", () => {
      expect(ctx.service.greet("World")).toBe("Hello, World!");
    });
  });

  describe("getGreetingsByBatch", () => {
    it("should return greetings for multiple names", async () => {
      const names = ["Alice", "Bob", "Charlie"];
      const result = await ctx.service.getGreetingsByBatch(names);
      expect(result).toEqual([
        "Hello, Alice!",
        "Hello, Bob!",
        "Hello, Charlie!",
      ]);
    });
  });
});
