/**
 * @file clear-mocks.util.ts
 * @description Utilities for clearing and tracking vitest mocks across tests
 * @module test-utils
 */

import { afterEach, expect, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Options for clearing mocks
 */
export interface ClearMocksOptions {
  /**
   * Whether to reset mock implementation (default: false)
   */
  readonly resetMocks?: boolean;

  /**
   * Whether to restore original implementation (default: false)
   */
  readonly restoreMocks?: boolean;

  /**
   * Specific mocks to clear (if not provided, clears all)
   */
  readonly specificMocks?: Mock[];
}

/**
 * Applies the configured clear strategy to a single mock
 * @param mock - Mock function to clear
 * @param options - Options for clearing mocks
 */
function clearSingleMock(mock: Mock, options: ClearMocksOptions): void {
  if (options.restoreMocks) {
    mock.mockRestore();
  } else if (options.resetMocks) {
    mock.mockReset();
  } else {
    mock.mockClear();
  }
}

/**
 * Applies the configured clear strategy to every registered mock
 * @param options - Options for clearing mocks
 */
function clearEveryMock(options: ClearMocksOptions): void {
  if (options.restoreMocks) {
    vi.restoreAllMocks();
  } else if (options.resetMocks) {
    vi.resetAllMocks();
  } else {
    vi.clearAllMocks();
  }
}

/**
 * Clears all vitest mocks with configurable options
 * @param options - Options for clearing mocks
 */
export function clearMocks(options: ClearMocksOptions = {}): void {
  if (options.specificMocks && options.specificMocks.length > 0) {
    options.specificMocks.forEach(mock => clearSingleMock(mock, options));
  } else {
    clearEveryMock(options);
  }
}

/**
 * Sets up automatic mock clearing for test suites
 * @param options - Options for clearing mocks
 */
export function setupAutoClearMocks(options: ClearMocksOptions = {}): void {
  afterEach(() => {
    clearMocks(options);
  });
}

/**
 * Utility to track mock calls across tests
 * @description Registers named mocks and provides assertion helpers for them
 */
export class MockCallTracker {
  private mockCalls: Map<string, Mock> = new Map();

  /**
   * Register a mock to track
   * @param name - Name identifier for the mock
   * @param mock - The vitest mock function
   */
  track(name: string, mock: Mock): void {
    this.mockCalls.set(name, mock);
  }

  /**
   * Get call count for a specific mock
   * @param name - Name identifier for the mock
   * @returns Number of times the mock was called
   */
  getCallCount(name: string): number {
    const mock = this.mockCalls.get(name);
    return mock ? mock.mock.calls.length : 0;
  }

  /**
   * Get all calls for a specific mock
   * @param name - Name identifier for the mock
   * @returns Array of call arguments
   */
  getCalls(name: string): unknown[][] {
    const mock = this.mockCalls.get(name);
    return mock ? mock.mock.calls : [];
  }

  /**
   * Get the last call for a specific mock
   * @param name - Name identifier for the mock
   * @returns Arguments of the last call
   */
  getLastCall(name: string): unknown[] | undefined {
    const calls = this.getCalls(name);
    return calls[calls.length - 1];
  }

  /**
   * Assert that a mock was called with specific arguments
   * @param name - Name identifier for the mock
   * @param expectedArgs - Expected arguments
   */
  assertCalledWith(name: string, ...expectedArgs: unknown[]): void {
    const mock = this.mockCalls.get(name);
    if (!mock) {
      throw new Error(`Mock '${name}' not found in tracker`);
    }
    expect(mock).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Assert that a mock was called a specific number of times
   * @param name - Name identifier for the mock
   * @param expectedCount - Expected call count
   */
  assertCallCount(name: string, expectedCount: number): void {
    const actualCount = this.getCallCount(name);
    expect(actualCount).toBe(expectedCount);
  }

  /**
   * Clear all tracked mocks
   */
  clear(): void {
    this.mockCalls.forEach(mock => mock.mockClear());
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.clear();
    this.mockCalls.clear();
  }
}

/**
 * Global mock tracker instance for use across tests
 */
export const globalMockTracker = new MockCallTracker();
