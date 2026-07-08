/**
 * @file resolver-test.setup.ts
 * @description Helpers for setting up GraphQL resolver tests with mocked data loaders
 * @module test-utils
 */

import { afterEach, expect, it, vi } from "vitest";
import { Type } from "@nestjs/common";
import {
  TestingModuleConfig,
  TestingModuleContext,
  setupTestingModule,
} from "./testing-module.setup";
import { IDataLoaders } from "../../data-loader/data-loader.interface";
import { createMockDataLoaders } from "../builders/dataloader.builder";

/**
 * Injection token under which mocked data loaders are provided
 */
export const DATA_LOADERS_TOKEN = "DATA_LOADERS";

/**
 * Specialized configuration for resolver tests
 */
export interface ResolverTestConfig<T> extends Omit<
  TestingModuleConfig<T>,
  "provider"
> {
  /**
   * The resolver class to test
   */
  readonly resolver: Type<T>;

  /**
   * Mock data loaders configuration
   */
  readonly dataLoaders?: Partial<IDataLoaders> | (() => Partial<IDataLoaders>);

  /**
   * Whether to automatically provide the DATA_LOADERS token
   */
  readonly provideDataLoaders?: boolean;
}

/**
 * Extended context for resolver tests
 */
export interface ResolverTestContext<T> extends TestingModuleContext<T> {
  /**
   * The resolver instance (alias for provider)
   */
  readonly resolver: T;

  /**
   * Mock data loaders if provided
   */
  readonly dataLoaders?: IDataLoaders;
}

/**
 * Resolves the mock data loaders for a resolver test configuration
 * @param config - Configuration for the resolver test
 * @returns Fully mocked data loaders, or undefined when disabled
 */
function resolveDataLoaders<T>(
  config: ResolverTestConfig<T>
): IDataLoaders | undefined {
  if (config.provideDataLoaders === false) {
    return undefined;
  }

  const overrides =
    typeof config.dataLoaders === "function"
      ? config.dataLoaders()
      : (config.dataLoaders ?? {});

  return { ...createMockDataLoaders(), ...overrides };
}

/**
 * Sets up a resolver test with common configuration
 * @param config - Configuration for the resolver test
 * @returns Context object with resolver and testing utilities
 */
export async function setupResolverTest<T>(
  config: ResolverTestConfig<T>
): Promise<ResolverTestContext<T>> {
  const mockDataLoaders = resolveDataLoaders(config);
  const providers = [
    ...(config.providers ?? []),
    ...(mockDataLoaders
      ? [{ provide: DATA_LOADERS_TOKEN, useValue: mockDataLoaders }]
      : []),
  ];
  const moduleContext = await setupTestingModule({
    provider: config.resolver,
    providers,
    imports: config.imports,
    exports: config.exports,
    customizeModule: config.customizeModule,
  });

  return {
    ...moduleContext,
    resolver: moduleContext.provider,
    dataLoaders: mockDataLoaders,
  };
}

/**
 * Common resolver test setup with standard assertions
 * @param resolverClass - The resolver class to test
 * @param dependencies - Mock dependencies to provide
 * @returns Function to run the standard tests
 */
export function createResolverTestSuite<T>(
  resolverClass: Type<T>,
  dependencies: Record<string, unknown> = {}
): () => void {
  return () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should be defined", async () => {
      const providers = Object.entries(dependencies).map(([token, value]) => ({
        provide: token,
        useValue: value,
      }));
      const context = await setupResolverTest({
        resolver: resolverClass,
        providers,
      });

      expect(context.resolver).toBeDefined();
    });
  };
}

/**
 * GraphQL request context shape used by HTTP transports
 */
export interface GraphQLRequestContext {
  req: {
    headers: Record<string, string>;
    user: unknown;
    [key: string]: unknown;
  };
  res: {
    locals: Record<string, unknown>;
    [key: string]: unknown;
  };
  dataSources: Record<string, unknown>;
  loaders?: IDataLoaders;
  [key: string]: unknown;
}

/**
 * Helper to create a request-scoped GraphQL context object for resolver tests
 * @param overrides - Properties to override in the context
 * @returns GraphQL request context object
 */
export function createMockGraphQLRequestContext(
  overrides: Partial<GraphQLRequestContext> = {}
): GraphQLRequestContext {
  return {
    req: {
      headers: {},
      user: null,
      ...overrides.req,
    },
    res: {
      locals: {},
      ...overrides.res,
    },
    dataSources: {},
    ...overrides,
  };
}
