/**
 * @file database.module.test.ts
 * @description Unit tests for DatabaseModule
 * @module database
 */

import { vi, expect } from "vitest";

/**
 * Captured forRootAsync call arguments
 */
type ForRootAsyncOptions = {
  inject?: unknown[];
  useFactory?: (...args: unknown[]) => unknown;
  dataSourceFactory?: (options: unknown) => Promise<unknown>;
};

/**
 * Storage object for captured options (hoisted before mock)
 */
const { captured } = vi.hoisted(() => ({
  captured: {} as { options?: ForRootAsyncOptions },
}));

/**
 * Mock TypeOrmModule to capture forRootAsync options
 */
vi.mock("@nestjs/typeorm", () => ({
  TypeOrmModule: {
    forRootAsync: vi.fn((options: ForRootAsyncOptions) => {
      captured.options = options;
      return {
        module: class MockTypeOrmModule {},
        providers: [
          {
            provide: "DATA_SOURCE",
            useValue: {},
          },
        ],
        exports: ["DATA_SOURCE"],
      };
    }),
  },
  getDataSourceToken: vi.fn().mockReturnValue("DATA_SOURCE"),
}));

/**
 * Mock database.config module
 */
vi.mock("./database.config", () => ({
  createTypeOrmOptionsFromConfigService: vi.fn().mockResolvedValue({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "test",
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Test mock value, not real credential
    password: "test",
    database: "test",
    autoLoadEntities: false,
  }),
}));

import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "./database.module";

/**
 * Test context interface for DatabaseModule tests
 */
interface TestContext {
  module: TestingModule | null;
}

describe("DatabaseModule", () => {
  const ctx: TestContext = { module: null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (ctx.module) {
      await ctx.module.close();
      ctx.module = null;
    }
  });

  it("should be defined", async () => {
    ctx.module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    expect(ctx.module).toBeDefined();
  });

  it("should inject ConfigService in useFactory", () => {
    // The module decorator is evaluated at import time, so we check captured options
    expect(captured.options).toBeDefined();
    expect(captured.options?.inject).toContain(ConfigService);
  });

  it("should pass dataSourceFactory to forRootAsync", () => {
    expect(captured.options).toBeDefined();
    expect(captured.options?.dataSourceFactory).toBeDefined();
    expect(typeof captured.options?.dataSourceFactory).toBe("function");
  });

  it("should have useFactory that accepts ConfigService", () => {
    expect(captured.options).toBeDefined();
    expect(captured.options?.useFactory).toBeDefined();
    expect(typeof captured.options?.useFactory).toBe("function");
  });

  it("should not use @Global decorator", () => {
    // When @Global() is used, Reflect.getMetadata returns true for '__module:global__' key
    const isGlobal = Reflect.getMetadata("__module:global__", DatabaseModule);
    expect(isGlobal).not.toBe(true);
  });

  describe("dataSourceFactory", () => {
    it("should throw error when options are undefined", async () => {
      expect(captured.options?.dataSourceFactory).toBeDefined();
      const dataSourceFactory = captured.options?.dataSourceFactory;

      if (dataSourceFactory) {
        await expect(dataSourceFactory(undefined)).rejects.toThrow(
          "DataSource options are required"
        );
      }
    });

    it("should be a function that accepts options parameter", () => {
      expect(captured.options?.dataSourceFactory).toBeDefined();
      const dataSourceFactory = captured.options?.dataSourceFactory;

      expect(typeof dataSourceFactory).toBe("function");
    });
  });
});
