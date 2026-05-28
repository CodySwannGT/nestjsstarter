/**
 * @file data-loader.service.test.ts
 * @description Unit tests for DataLoaderService
 * @module data-loader
 */

import { expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { DataLoaderService } from "./data-loader.service";
import { HelloService } from "../hello/hello.service";

/**
 * Test context interface for DataLoaderService tests
 */
interface TestContext {
  module: TestingModule;
  service: DataLoaderService;
}

describe("DataLoaderService", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    ctx.module = await Test.createTestingModule({
      providers: [DataLoaderService, HelloService],
    }).compile();

    ctx.service = ctx.module.get<DataLoaderService>(DataLoaderService);
  });

  afterEach(async () => {
    await ctx.module.close();
  });

  describe("getLoaders", () => {
    it("should return an object with greetingsLoader", () => {
      const loaders = ctx.service.getLoaders();
      expect(loaders).toHaveProperty("greetingsLoader");
    });

    it("greetingsLoader should batch load greetings", async () => {
      const loaders = ctx.service.getLoaders();
      const result = await loaders.greetingsLoader.load("Test");
      expect(result).toBe("Hello, Test!");
    });

    it("greetingsLoader should batch multiple requests", async () => {
      const loaders = ctx.service.getLoaders();
      const [result1, result2] = await Promise.all([
        loaders.greetingsLoader.load("Alice"),
        loaders.greetingsLoader.load("Bob"),
      ]);
      expect(result1).toBe("Hello, Alice!");
      expect(result2).toBe("Hello, Bob!");
    });
  });
});
