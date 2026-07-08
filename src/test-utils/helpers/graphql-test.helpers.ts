/**
 * @file graphql-test.helpers.ts
 * @description Helpers for building GraphQL execution contexts and assertions in tests
 * @module test-utils
 */

import { expect, vi } from "vitest";
import type { Mock } from "vitest";
import { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
} from "graphql";

/**
 * Create a mock GraphQL execution context for testing
 * @param user - The authenticated user
 * @param additionalContext - Additional context properties
 * @returns Mock ExecutionContext
 */
export function createMockGqlContext<TUser = unknown>(
  user?: TUser,
  additionalContext: Record<string, unknown> = {}
): ExecutionContext {
  const context = {
    req: {
      user,
      headers: {},
    },
    ...additionalContext,
  };

  return {
    switchToHttp: vi.fn(),
    switchToRpc: vi.fn(),
    switchToWs: vi.fn(),
    getType: vi.fn(() => "graphql"),
    getHandler: vi.fn(),
    getClass: vi.fn(),
    // GraphQL resolver args: (root, args, context, info)
    getArgs: vi.fn(() => [{}, {}, context, {}]),
    getArgByIndex: vi.fn(),
    // Create method is used by GqlExecutionContext
    create: vi.fn(() => context),
  } as unknown as ExecutionContext;
}

/**
 * Create a mock GraphQL context object with loaders
 * @param loaders - DataLoaders instance
 * @param additionalContext - Additional context properties
 * @returns GraphQL context object
 */
export function createMockGraphQLContext<T = unknown>(
  loaders: T,
  additionalContext: Record<string, unknown> = {}
): { loaders: T } & Record<string, unknown> {
  return {
    loaders,
    ...additionalContext,
  };
}

/**
 * Mock a current-user decorator value extraction
 * @param user - User to return
 * @returns Mock function for decorator testing
 */
export function mockCurrentUserDecorator<TUser>(
  user: TUser
): Mock<(data: unknown, ctx: ExecutionContext) => TUser> {
  return vi.fn((_data: unknown, ctx: ExecutionContext) => {
    // Create GQL context to simulate decorator behavior
    GqlExecutionContext.create(ctx);
    return user;
  });
}

/**
 * Create mock GraphQL field resolver info
 * @param fieldName - Name of the field being resolved
 * @param parentType - Parent type name
 * @returns Partial GraphQLResolveInfo for testing
 */
export function createMockFieldResolverInfo(
  fieldName: string,
  parentType: string = "Query"
): Partial<GraphQLResolveInfo> {
  const fieldNode: FieldNode = {
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: fieldName },
  };

  return {
    fieldName,
    fieldNodes: [fieldNode],
    returnType: {} as GraphQLResolveInfo["returnType"],
    parentType: {
      name: parentType,
    } as GraphQLResolveInfo["parentType"],
    path: {
      key: fieldName,
      typename: parentType,
      prev: undefined,
    },
    schema: {} as GraphQLSchema,
    fragments: {} as Record<string, FragmentDefinitionNode>,
    rootValue: {},
    operation: {
      kind: Kind.OPERATION_DEFINITION,
      operation: OperationTypeNode.QUERY,
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [],
      },
    } as OperationDefinitionNode,
    variableValues: {},
  };
}

/**
 * Mock GraphQL subscription context shape
 */
export interface MockSubscriptionContext<TUser> {
  readonly connectionId: string;
  readonly user?: TUser;
  readonly connectionParams: Record<string, unknown>;
  readonly extra: Record<string, unknown>;
}

/**
 * Create a mock GraphQL subscription context
 * @param connectionId - WebSocket connection ID
 * @param user - Authenticated user
 * @returns Mock subscription context
 */
export function createMockSubscriptionContext<TUser = unknown>(
  connectionId: string,
  user?: TUser
): MockSubscriptionContext<TUser> {
  return {
    connectionId,
    user,
    connectionParams: {},
    extra: {},
  };
}

/**
 * Error shape carrying GraphQL extensions
 */
interface GraphQLErrorWithExtensions extends Error {
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
}

/**
 * Assert GraphQL error format
 * @param error - Error object to check
 * @param expectedCode - Expected error code
 * @param expectedMessage - Expected error message (partial match)
 */
export function assertGraphQLError(
  error: GraphQLErrorWithExtensions,
  expectedCode: string,
  expectedMessage?: string
): void {
  expect(error).toBeDefined();
  expect(error.extensions?.code).toBe(expectedCode);

  if (expectedMessage) {
    expect(error.message).toContain(expectedMessage);
  }
}

/**
 * Create mock GraphQL variables
 * @param overrides - Variable overrides
 * @returns Variables object
 */
export function createMockVariables<T = Record<string, unknown>>(
  overrides: T
): T {
  return overrides;
}
