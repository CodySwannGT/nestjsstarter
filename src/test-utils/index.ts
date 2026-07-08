/**
 * @file index.ts
 * @description Barrel exports for generic NestJS test utilities
 * @module test-utils
 */

// Shared relay-style pagination types
export * from "./relay.types";

// Factory exports
export * from "./factories/mock-service.factory";
export * from "./factories/mock-repository.factory";
export * from "./factories/mock-dataloader.factory";
export * from "./factories/mock-connection.factory";

// Builder exports
export * from "./builders/dataloader.builder";
export * from "./builders/entity-mock.builder";

// Setup exports
export * from "./setup/testing-module.setup";
export * from "./setup/resolver-test.setup";
export * from "./setup/clear-mocks.util";

// Helper exports
export {
  createMockGqlContext,
  createMockGraphQLContext,
  createMockFieldResolverInfo,
  assertGraphQLError,
  createMockSubscriptionContext,
  createMockVariables,
  mockCurrentUserDecorator,
} from "./helpers/graphql-test.helpers";
export type { MockSubscriptionContext } from "./helpers/graphql-test.helpers";
export * from "./helpers/error-test.helpers";
export {
  createMockConnectionArgs,
  createMockPageInfo as createMockPageInfoHelper,
  createMockEdge,
  createMockConnection as createMockConnectionHelper,
  createEmptyConnection as createEmptyConnectionHelper,
  createMockCursor,
  decodeCursor as decodeCursorHelper,
  assertConnectionStructure,
  testPaginationBehavior,
  createMockPaginatedResult,
} from "./helpers/pagination-test.helpers";
export type { MockPaginatedResult } from "./helpers/pagination-test.helpers";
