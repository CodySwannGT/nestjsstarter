/**
 * @file pagination-test.helpers.ts
 * @description Helpers for building and asserting relay-style pagination in tests
 * @module test-utils
 */

import { expect } from "vitest";
import type {
  Connection,
  ConnectionArgs,
  Edge,
  PageInfo,
} from "../relay.types";

/**
 * Result shape produced by simple paginated loaders
 */
export interface MockPaginatedResult<T> {
  readonly nodes: T[];
  readonly hasMore: boolean;
  readonly cursor: string | null;
}

/**
 * Create mock connection arguments for testing
 * @param overrides - Properties to override
 * @returns ConnectionArgs object
 */
export function createMockConnectionArgs(
  overrides: Partial<ConnectionArgs> = {}
): ConnectionArgs {
  return {
    first: 10,
    after: undefined,
    before: undefined,
    last: undefined,
    ...overrides,
  };
}

/**
 * Create mock page info for testing
 * @param overrides - Properties to override
 * @returns PageInfo object
 */
export function createMockPageInfo(
  overrides: Partial<PageInfo> = {}
): PageInfo {
  return {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
    ...overrides,
  };
}

/**
 * Create a mock edge for testing
 * @param node - Node data
 * @param cursor - Cursor string
 * @returns Edge object
 */
export function createMockEdge<T>(node: T, cursor: string): Edge<T> {
  return {
    node,
    cursor,
  };
}

/**
 * Create a mock connection result
 * @param nodes - Array of nodes
 * @param pageInfo - Page info overrides
 * @returns Connection object
 */
export function createMockConnection<T>(
  nodes: T[],
  pageInfo: Partial<PageInfo> = {}
): Connection<T> {
  const edges = nodes.map((node, index) =>
    createMockEdge(node, `cursor-${index + 1}`)
  );

  return {
    edges,
    pageInfo: createMockPageInfo({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
      ...pageInfo,
    }),
  };
}

/**
 * Create an empty connection result
 * @returns Empty connection object
 */
export function createEmptyConnection<T>(): Connection<T> {
  return createMockConnection<T>([], {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
}

/**
 * Assert connection structure
 * @param connection - Connection to validate
 * @param expectedCount - Expected number of edges
 */
export function assertConnectionStructure<T>(
  connection: Connection<T>,
  expectedCount: number
): void {
  expect(connection).toHaveProperty("edges");
  expect(connection).toHaveProperty("pageInfo");
  expect(connection.edges).toHaveLength(expectedCount);

  // Validate page info structure
  expect(connection.pageInfo).toHaveProperty("hasNextPage");
  expect(connection.pageInfo).toHaveProperty("hasPreviousPage");
  expect(connection.pageInfo).toHaveProperty("startCursor");
  expect(connection.pageInfo).toHaveProperty("endCursor");

  // Validate edges structure
  connection.edges.forEach(edge => {
    expect(edge).toHaveProperty("node");
    expect(edge).toHaveProperty("cursor");
  });
}

/**
 * Create mock cursor for testing
 * @param id - ID to encode
 * @param prefix - Optional prefix
 * @returns Base64 encoded cursor
 */
export function createMockCursor(id: string, prefix: string = ""): string {
  const value = prefix ? `${prefix}:${id}` : id;
  return Buffer.from(value).toString("base64");
}

/**
 * Decode a cursor for testing
 * @param cursor - Cursor to decode
 * @returns Decoded cursor value
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

/**
 * Helper to test pagination behavior
 * @param fetchFn - Function that fetches paginated data
 * @param totalItems - Total number of items available
 */
export async function testPaginationBehavior<T>(
  fetchFn: (args: ConnectionArgs) => Promise<Connection<T>>,
  totalItems: number
): Promise<void> {
  // Test first page
  const firstPage = await fetchFn({ first: 5 });
  assertConnectionStructure(firstPage, Math.min(5, totalItems));

  if (totalItems > 5) {
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
  }

  // Test with after cursor
  if (firstPage.pageInfo.endCursor) {
    const secondPage = await fetchFn({
      first: 5,
      after: firstPage.pageInfo.endCursor,
    });
    assertConnectionStructure(secondPage, Math.min(5, totalItems - 5));
    expect(secondPage.pageInfo.hasPreviousPage).toBe(true);
  }

  // Test last items
  const lastPage = await fetchFn({ last: 5 });
  assertConnectionStructure(lastPage, Math.min(5, totalItems));

  if (totalItems > 5) {
    expect(lastPage.pageInfo.hasPreviousPage).toBe(true);
  }
}

/**
 * Create mock paginated loader result
 * @param nodes - Nodes to return
 * @param hasMore - Whether there are more results
 * @returns Paginated result structure
 */
export function createMockPaginatedResult<T>(
  nodes: T[],
  hasMore: boolean = false
): MockPaginatedResult<T> {
  return {
    nodes,
    hasMore,
    cursor: nodes.length > 0 ? createMockCursor(String(nodes.length)) : null,
  };
}
