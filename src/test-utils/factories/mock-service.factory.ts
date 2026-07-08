/**
 * @file mock-service.factory.ts
 * @description Factories for creating strongly typed vitest mock services
 * @module test-utils
 */

import { vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Type helper for creating strongly typed mock services
 */
export type MockService<T> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? Mock<(...args: TArgs) => TReturn>
    : T[K];
};

/**
 * Type for method return values in mock services
 */
type MethodReturnValue<T> = T extends (...args: unknown[]) => unknown
  ? ReturnType<T>
  : unknown;

/**
 * Creates a mock service with all methods mocked using vi.fn()
 * @param methods - Array of method names to mock
 * @returns Mocked service object
 */
export function createMockService<T>(methods: (keyof T)[]): MockService<T> {
  return Object.fromEntries(
    methods.map(method => [method, vi.fn()])
  ) as MockService<T>;
}

/**
 * Creates a mock service with methods and their default return values
 * @param methodMap - Object mapping method names to their default return values
 * @returns Mocked service object with default implementations
 */
export function createMockServiceWithDefaults<T>(
  methodMap: Partial<{
    [K in keyof T]:
      | MethodReturnValue<T[K]>
      | ((
          ...args: Parameters<
            T[K] extends (...args: unknown[]) => unknown ? T[K] : never
          >
        ) => MethodReturnValue<T[K]>);
  }>
): MockService<T> {
  return Object.fromEntries(
    Object.entries(methodMap).map(([method, defaultValue]) => [
      method,
      typeof defaultValue === "function"
        ? vi.fn(defaultValue as (...args: unknown[]) => unknown)
        : vi.fn().mockReturnValue(defaultValue),
    ])
  ) as MockService<T>;
}

/**
 * Helper to get the mocked version of a service for type-safe assertions
 * @param service - Service instance created by a mock factory
 * @returns The same service typed as its mocked counterpart
 */
export function asMockService<T>(service: T): MockService<T> {
  return service as MockService<T>;
}
