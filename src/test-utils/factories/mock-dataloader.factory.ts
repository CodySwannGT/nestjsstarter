/**
 * @file mock-dataloader.factory.ts
 * @description Factories for creating mock DataLoader instances in tests
 * @module test-utils
 */

import { vi } from "vitest";
import type { Mock } from "vitest";
import DataLoader from "dataloader";
import type { Connection } from "../relay.types";

/**
 * Type helper for mocked DataLoader
 */
export type MockDataLoader<K, V> = {
  load: Mock<(key: K) => Promise<V>>;
  loadMany: Mock<(keys: readonly K[]) => Promise<(V | Error)[]>>;
  clear: Mock<(key: K) => DataLoader<K, V>>;
  clearAll: Mock<() => DataLoader<K, V>>;
  prime: Mock<(key: K, value: V | Promise<V> | Error) => DataLoader<K, V>>;
};

/**
 * Shape of a mocked paginated loader that resolves relay-style connections
 */
export interface MockPaginatedLoader<T> {
  readonly load: Mock<(key: unknown) => Promise<Connection<T>>>;
  readonly loadMany: Mock<(keys: readonly unknown[]) => Promise<unknown[]>>;
}

/**
 * Creates a mock DataLoader with all standard methods
 * @param defaultData - Optional default data to return
 * @returns Mocked DataLoader object
 */
export function createMockDataLoader<K, V>(
  defaultData?: V | null
): DataLoader<K, V> & MockDataLoader<K, V> {
  const mockDataLoader = {
    load: vi.fn().mockResolvedValue(defaultData as V),
    loadMany: vi.fn().mockResolvedValue([] as (V | Error)[]),
    clear: vi.fn().mockReturnThis(),
    clearAll: vi.fn().mockReturnThis(),
    prime: vi.fn().mockReturnThis(),
    name: "MockDataLoader",
  };

  return mockDataLoader as DataLoader<K, V> & MockDataLoader<K, V>;
}

/**
 * Creates a mock DataLoader that returns specific values for specific keys
 * @param dataMap - Map of keys to values
 * @returns Mocked DataLoader object
 */
export function createMockDataLoaderWithMap<K, V>(
  dataMap: Map<K, V>
): DataLoader<K, V> & MockDataLoader<K, V> {
  const mockDataLoader = createMockDataLoader<K, V>();

  (mockDataLoader.load as Mock<(key: K) => Promise<V>>).mockImplementation(
    (key: K) => {
      const value = dataMap.get(key);
      return Promise.resolve(value ?? null) as Promise<V>;
    }
  );

  (
    mockDataLoader.loadMany as Mock<
      (keys: readonly K[]) => Promise<(V | Error)[]>
    >
  ).mockImplementation((keys: readonly K[]) => {
    const values = keys.map(key => dataMap.get(key) ?? null);
    return Promise.resolve(values) as Promise<(V | Error)[]>;
  });

  return mockDataLoader;
}

/**
 * Creates a mock DataLoader that handles arrays or single values
 * @param defaultArray - Default array to return from load
 * @returns Mocked DataLoader object whose values are arrays
 * @remarks Useful for loaders that batch-load one-to-many relations
 */
export function createMockArrayDataLoader<K, V>(
  defaultArray: V[] = []
): DataLoader<K, V[]> & MockDataLoader<K, V[]> {
  const mockDataLoader = {
    load: vi.fn().mockResolvedValue(defaultArray as V[]),
    loadMany: vi.fn().mockResolvedValue([defaultArray] as (V[] | Error)[]),
    clear: vi.fn().mockReturnThis(),
    clearAll: vi.fn().mockReturnThis(),
    prime: vi.fn().mockReturnThis(),
    name: "MockArrayDataLoader",
  };

  return mockDataLoader as DataLoader<K, V[]> & MockDataLoader<K, V[]>;
}

/**
 * Creates a mock for paginated loaders that resolve relay-style connections
 * @returns Mocked paginated loader resolving an empty connection by default
 * @remarks
 * Paginated loaders don't follow the standard DataLoader interface — they
 * resolve a Connection instead of a single value.
 */
export function createMockPaginatedLoader<T>(): MockPaginatedLoader<T> {
  const defaultConnection: Connection<T> = {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };

  return {
    load: vi.fn().mockResolvedValue(defaultConnection),
    loadMany: vi.fn().mockResolvedValue([]),
  };
}
