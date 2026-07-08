/**
 * @file mock-connection.factory.ts
 * @description Factories for creating mock relay-style connections in tests
 * @module test-utils
 */

import type {
  Connection,
  ConnectionWithCount,
  Edge,
  PageInfo,
} from "../relay.types";

/**
 * Encodes a cursor from an offset (mimics graphql-relay array connections)
 * @param offset - Numeric offset
 * @returns Base64 encoded cursor
 */
function encodeCursor(offset: number): string {
  return Buffer.from(`arrayconnection:${offset}`).toString("base64");
}

/**
 * Decodes a cursor to get the offset
 * @param cursor - Base64 encoded cursor
 * @returns Numeric offset
 */
export function decodeCursor(cursor: string): number {
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");
  const offset = decoded.replace("arrayconnection:", "");
  return parseInt(offset, 10);
}

/**
 * Creates mock edges from an array of items
 * @param items - Array of items
 * @param startOffset - Starting offset for cursor generation
 * @returns Array of Edge objects
 */
export function createMockEdges<T>(items: T[], startOffset = 0): Edge<T>[] {
  return items.map((item, index) => ({
    node: item,
    cursor: encodeCursor(startOffset + index),
  }));
}

/**
 * Creates mock page info
 * @param edges - Array of edges
 * @param hasNextPage - Whether there are more pages
 * @param hasPreviousPage - Whether there are previous pages
 * @returns PageInfo object
 */
export function createMockPageInfo<T>(
  edges: Edge<T>[],
  hasNextPage = false,
  hasPreviousPage = false
): PageInfo {
  return {
    hasNextPage,
    hasPreviousPage,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
  };
}

/**
 * Creates a mock relay-style connection
 * @param items - Array of items to create edges from
 * @param hasNextPage - Whether there are more pages
 * @param hasPreviousPage - Whether there are previous pages
 * @returns Mocked Connection object
 */
export function createMockConnection<T>(
  items: T[] = [],
  hasNextPage = false,
  hasPreviousPage = false
): Connection<T> {
  const edges = createMockEdges(items);
  const pageInfo = createMockPageInfo(edges, hasNextPage, hasPreviousPage);

  return {
    edges,
    pageInfo,
  };
}

/**
 * Creates a mock connection with total count (common pagination pattern)
 * @param items - Array of items
 * @param totalCount - Total count of items (for pagination)
 * @param hasNextPage - Whether there are more pages
 * @param hasPreviousPage - Whether there are previous pages
 * @returns Connection with totalCount property
 */
export function createMockConnectionWithCount<T>(
  items: T[] = [],
  totalCount?: number,
  hasNextPage = false,
  hasPreviousPage = false
): ConnectionWithCount<T> {
  const connection = createMockConnection(items, hasNextPage, hasPreviousPage);

  return {
    ...connection,
    totalCount: totalCount ?? items.length,
  };
}

/**
 * Creates an empty connection
 * @returns Empty Connection object
 */
export function createEmptyConnection<T>(): Connection<T> {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}
