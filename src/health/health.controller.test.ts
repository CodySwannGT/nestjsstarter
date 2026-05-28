/**
 * @file health.controller.test.ts
 * @description Unit tests for health controller with TypeORM health indicator
 * @module health
 */

import { vi, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { HealthController } from "./health.controller";

/**
 * Mock HealthCheckService that simulates terminus health check behavior
 */
const mockHealthCheckService = {
  check: vi.fn(),
};

/**
 * Mock TypeOrmHealthIndicator that simulates database connectivity check
 */
const mockTypeOrmHealthIndicator = {
  pingCheck: vi.fn(),
};

/**
 * Executes all indicator functions passed to health check
 * @param indicators - Array of indicator functions to execute
 * @returns Promise that resolves after all indicators have been called
 */
const executeIndicators = async (
  indicators: ReadonlyArray<() => Promise<unknown>>
): Promise<void> => {
  await Promise.all(indicators.map(indicator => indicator()));
};

/**
 * Test context interface for HealthController tests
 */
interface TestContext {
  module: TestingModule | null;
}

/**
 * Creates a test module and returns the HealthController instance
 * @param ctx - Test context to store module reference for cleanup
 * @returns Promise resolving to HealthController instance
 */
const createTestController = async (
  ctx: TestContext
): Promise<HealthController> => {
  ctx.module = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: HealthCheckService,
        useValue: mockHealthCheckService,
      },
      {
        provide: TypeOrmHealthIndicator,
        useValue: mockTypeOrmHealthIndicator,
      },
    ],
  }).compile();

  return ctx.module.get<HealthController>(HealthController);
};

describe("HealthController", () => {
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
    const controller = await createTestController(ctx);
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it("should return health check results", async () => {
      const expectedResult: HealthCheckResult = {
        status: "ok",
        info: {
          database: { status: "up" },
        },
        error: {},
        details: {
          database: { status: "up" },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const controller = await createTestController(ctx);
      const result = await controller.check();

      expect(result).toEqual(expectedResult);
      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
    });

    it("should include database health indicator", async () => {
      const databaseCheckResult = { database: { status: "up" as const } };
      mockTypeOrmHealthIndicator.pingCheck.mockResolvedValue(
        databaseCheckResult
      );

      const expectedResult: HealthCheckResult = {
        status: "ok",
        info: databaseCheckResult,
        error: {},
        details: databaseCheckResult,
      };

      mockHealthCheckService.check.mockImplementation(
        async (indicators: ReadonlyArray<() => Promise<unknown>>) => {
          await executeIndicators(indicators);
          return expectedResult;
        }
      );

      const controller = await createTestController(ctx);
      await controller.check();

      expect(mockTypeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith(
        "database"
      );
    });
  });
});
