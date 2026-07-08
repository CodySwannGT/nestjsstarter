/**
 * @file testing-module.setup.ts
 * @description Helpers for setting up NestJS testing modules with common configuration
 * @module test-utils
 */

import { vi } from "vitest";
import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";
import { ModuleMetadata, Provider, Type } from "@nestjs/common";

/**
 * Configuration options for setting up a testing module
 */
export interface TestingModuleConfig<T> {
  /**
   * The class to test (resolver, service, etc.)
   */
  readonly provider: Type<T>;

  /**
   * Additional providers (mocks, services, etc.)
   */
  readonly providers?: Provider[];

  /**
   * Module imports - matches NestJS ModuleMetadata.imports type
   */
  readonly imports?: ModuleMetadata["imports"];

  /**
   * Module exports - matches NestJS ModuleMetadata.exports type
   */
  readonly exports?: ModuleMetadata["exports"];

  /**
   * Custom module builder modifications
   */
  readonly customizeModule?: (
    builder: TestingModuleBuilder
  ) => TestingModuleBuilder;
}

/**
 * Context returned from setting up a testing module
 */
export interface TestingModuleContext<T> {
  /**
   * The instantiated provider being tested
   */
  readonly provider: T;

  /**
   * The compiled testing module
   */
  readonly module: TestingModule;

  /**
   * Helper to get any provider from the module
   */
  readonly get: <TInput = unknown, TResult = TInput>(
    token: Type<TInput> | string | symbol
  ) => TResult;

  /**
   * Clear all mocks in the module
   */
  readonly clearAllMocks: () => void;
}

/**
 * Sets up a NestJS testing module with common configuration
 * @param config - Configuration for the testing module
 * @returns Context object with the provider and module
 */
export async function setupTestingModule<T>(
  config: TestingModuleConfig<T>
): Promise<TestingModuleContext<T>> {
  const baseBuilder = Test.createTestingModule({
    providers: [config.provider, ...(config.providers ?? [])],
    imports: config.imports ?? [],
    exports: config.exports ?? [],
  });
  const moduleBuilder = config.customizeModule
    ? config.customizeModule(baseBuilder)
    : baseBuilder;

  const module = await moduleBuilder.compile();
  const provider = module.get<T>(config.provider);

  return {
    provider,
    module,
    get: <TInput = unknown, TResult = TInput>(
      token: Type<TInput> | string | symbol
    ) => module.get<TInput, TResult>(token),
    clearAllMocks: () => vi.clearAllMocks(),
  };
}

/**
 * Helper to create a provider override for testing
 * @param token - The token to override
 * @param value - The mock value to use
 * @returns Provider configuration
 */
export function createMockProvider<T>(
  token: Type<T> | string | symbol,
  value: Partial<T> | unknown
): Provider {
  return {
    provide: token,
    useValue: value,
  };
}

/**
 * Helper to create multiple mock providers
 * @param mocks - Object mapping tokens to mock values
 * @returns Array of provider configurations
 */
export function createMockProviders(
  mocks: Record<string, unknown>
): Provider[] {
  return Object.entries(mocks).map(([token, value]) => ({
    provide: token,
    useValue: value,
  }));
}

/**
 * Creates a testing module with automatic cleanup
 * @param config - Configuration for the testing module
 * @param testFn - Test function to run with the module context
 */
export async function withTestingModule<T>(
  config: TestingModuleConfig<T>,
  testFn: (context: TestingModuleContext<T>) => Promise<void> | void
): Promise<void> {
  const context = await setupTestingModule(config);

  try {
    await testFn(context);
  } finally {
    // Clean up the module
    await context.module.close();
  }
}
