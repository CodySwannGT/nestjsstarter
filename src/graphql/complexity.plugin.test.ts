/**
 * @file complexity.plugin.test.ts
 * @description Unit tests for query complexity plugin
 * @module graphql
 */

import { vi, expect } from "vitest";
import { ConfigService } from "@nestjs/config";
import { GraphQLSchemaHost } from "@nestjs/graphql";
import { buildSchema, parse } from "graphql";
import { Configuration } from "../config/configuration";
import { ComplexityPlugin } from "./complexity.plugin";

/**
 * Creates a mock ConfigService with configurable values
 * @param maxComplexity - Maximum allowed query complexity
 * @param logQueryComplexity - Whether to log query complexity
 * @returns Mock ConfigService instance
 */
const createMockConfigService = (
  maxComplexity = 100,
  logQueryComplexity = false
): ConfigService<Configuration, true> => {
  const config = {
    graphql: {
      maxComplexity,
      logQueryComplexity,
    },
  };

  return {
    get: vi.fn((key: string) => {
      const keys = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test utility needs dynamic access
      const result = keys.reduce((obj: any, k) => obj?.[k], config);
      return result;
    }),
  } as unknown as ConfigService<Configuration, true>;
};

describe("ComplexityPlugin", () => {
  const mockSchema = buildSchema(`
    type Query {
      simple: String
      expensive: [Item]
    }
    type Item {
      id: ID!
      name: String
      nested: [Item]
    }
  `);

  const createPlugin = (
    maxComplexity = 100,
    logQueryComplexity = false
  ): ComplexityPlugin => {
    const schemaHost = {
      schema: mockSchema,
    } as GraphQLSchemaHost;

    const configService = createMockConfigService(
      maxComplexity,
      logQueryComplexity
    );

    return new ComplexityPlugin(schemaHost, configService);
  };

  describe("requestDidStart", () => {
    it("should allow simple queries within complexity limit", async () => {
      const plugin = createPlugin();
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await expect(
        listener.didResolveOperation?.(mockContext as never)
      ).resolves.not.toThrow();
    });

    it("should return listener with didResolveOperation", async () => {
      const plugin = createPlugin();
      const listener = await plugin.requestDidStart({} as never);

      expect(listener).toHaveProperty("didResolveOperation");
      expect(typeof listener.didResolveOperation).toBe("function");
    });

    it("should throw QueryComplexityError when complexity exceeds maximum", async () => {
      // Set maxComplexity to 0 so even a simple query with 1 field exceeds it
      const plugin = createPlugin(0);
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await expect(
        listener.didResolveOperation?.(mockContext as never)
      ).rejects.toThrow("exceeds maximum allowed complexity");
    });

    it("should include complexity values in the error message", async () => {
      const plugin = createPlugin(0);
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await expect(
        listener.didResolveOperation?.(mockContext as never)
      ).rejects.toThrow(/Query complexity of \d+ exceeds maximum allowed complexity of 0/);
    });

    it("should log query complexity when logQueryComplexity is true", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation();

      const plugin = createPlugin(100, true);
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await listener.didResolveOperation?.(mockContext as never);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Query complexity: \d+\/100/)
      );

      consoleSpy.mockRestore();
    });

    it("should not log complexity when logQueryComplexity is false", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation();

      const plugin = createPlugin(100, false);
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await listener.didResolveOperation?.(mockContext as never);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
