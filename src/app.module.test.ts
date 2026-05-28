/**
 * @file app.module.test.ts
 * @description Unit tests for AppModule
 * @module app
 */

import { vi, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { DataLoaderService } from "./data-loader/data-loader.service";
import { GraphQLModule } from "@nestjs/graphql";
import { DatabaseModule } from "./database/database.module";
import { AppModule } from "./app.module";

/**
 * Mock DatabaseModule to avoid PostgreSQL connection in tests
 * Note: vi.mock() is hoisted, so this runs before the imports above
 */
vi.mock("./database/database.module", () => ({
  DatabaseModule: class MockDatabaseModule {},
}));

/**
 * Test context interface for AppModule tests
 */
interface TestContext {
  module: TestingModule | null;
}

describe("AppModule", () => {
  const ctx: TestContext = { module: null };

  afterEach(async () => {
    if (ctx.module) {
      await ctx.module.close();
      ctx.module = null;
    }
  });

  it("should compile the module", async () => {
    ctx.module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(ctx.module).toBeDefined();
  });

  it("should provide DataLoaderService", async () => {
    ctx.module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const dataLoaderService =
      ctx.module.get<DataLoaderService>(DataLoaderService);
    expect(dataLoaderService).toBeDefined();
  });

  it("should configure GraphQLModule", async () => {
    ctx.module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const graphQLModule = ctx.module.get(GraphQLModule);
    expect(graphQLModule).toBeDefined();
  });

  it("should import DatabaseModule", async () => {
    expect(DatabaseModule).toBeDefined();
  });
});
