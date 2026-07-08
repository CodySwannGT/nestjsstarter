/**
 * @file relay.types.ts
 * @description Minimal generic Relay-style pagination types for test utilities
 * @module test-utils
 * @remarks
 * These types are intentionally small stand-ins for a full Relay module.
 * If a dedicated relay/pagination module is added later, these can be
 * replaced with imports from that module.
 */

/**
 * Relay-style page info describing cursor pagination state
 */
export interface PageInfo {
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor: string | null;
  readonly endCursor: string | null;
}

/**
 * Relay-style edge wrapping a node with its cursor
 */
export interface Edge<T> {
  readonly node: T;
  readonly cursor: string;
}

/**
 * Relay-style connection of edges plus page info
 */
export interface Connection<T> {
  readonly edges: Edge<T>[];
  readonly pageInfo: PageInfo;
}

/**
 * Connection extended with a total count (common pagination pattern)
 */
export type ConnectionWithCount<T> = Connection<T> & {
  readonly totalCount: number;
};

/**
 * Relay-style forward/backward pagination arguments
 */
export interface ConnectionArgs {
  readonly first?: number;
  readonly after?: string;
  readonly before?: string;
  readonly last?: number;
}
