/**
 * @file error-test.helpers.ts
 * @description Helpers for asserting error behavior in tests
 * @module test-utils
 */

import { expect, vi } from "vitest";
import type { Mock } from "vitest";
import { GraphQLError } from "graphql";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * Assert that a promise rejects with a specific error type
 * @param promise - Promise to test
 * @param errorType - Expected error constructor
 * @param errorMessage - Expected error message (partial match)
 */
export async function expectGraphQLError<T extends Error>(
  promise: Promise<unknown>,
  errorType: new (...args: unknown[]) => T,
  errorMessage?: string
): Promise<void> {
  await expect(promise).rejects.toThrow(errorType);

  if (errorMessage) {
    try {
      await promise;
    } catch (error) {
      expect((error as Error).message).toContain(errorMessage);
    }
  }
}

/**
 * Create a GraphQL error with extensions
 * @param message - Error message
 * @param code - Error code
 * @param extensions - Additional extensions
 * @returns GraphQLError instance
 */
export function createGraphQLError(
  message: string,
  code: string,
  extensions: Record<string, unknown> = {}
): GraphQLError {
  return new GraphQLError(message, {
    extensions: {
      code,
      ...extensions,
    },
  });
}

/**
 * Common GraphQL error codes
 */
export const GraphQLErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

/**
 * Create common HTTP exceptions for testing
 */
export const testExceptions = {
  badRequest: (message = "Bad Request") => new BadRequestException(message),

  notFound: (message = "Not Found") => new NotFoundException(message),

  unauthorized: (message = "Unauthorized") =>
    new UnauthorizedException(message),

  forbidden: (message = "Forbidden") => new ForbiddenException(message),

  conflict: (message = "Conflict") => new ConflictException(message),
};

/**
 * Assert error response structure
 * @param error - Error object
 * @param expectedStatus - Expected HTTP status code
 * @param expectedMessage - Expected error message
 */
export function assertErrorResponse(
  error: {
    status?: number;
    statusCode?: number;
    message?: string;
    response?: { message?: string };
  },
  expectedStatus: number,
  expectedMessage?: string
): void {
  expect(error.status ?? error.statusCode).toBe(expectedStatus);

  if (expectedMessage) {
    const message = error.message ?? error.response?.message;
    expect(message).toContain(expectedMessage);
  }
}

/**
 * Mock a rejected promise with a specific error
 * @param error - Error to reject with
 * @returns Mock function that returns rejected promise
 */
export function mockRejectedPromise(error: Error): Mock {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Mock a resolved promise with a value
 * @param value - Value to resolve with
 * @returns Mock function that returns resolved promise
 */
export function mockResolvedPromise<T>(value: T): Mock {
  return vi.fn().mockResolvedValue(value);
}

/**
 * Test error handler wrapper for async functions
 * @param fn - Async function to test
 * @returns The captured error, or null when no error was thrown
 */
export async function captureError<T = Error>(
  fn: () => Promise<unknown>
): Promise<T | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return error as T;
  }
}

/**
 * Validate error contains expected properties
 * @param error - Error to validate
 * @param properties - Expected properties
 */
export function validateErrorProperties(
  error: Record<string, unknown>,
  properties: Record<string, unknown>
): void {
  Object.entries(properties).forEach(([key, value]) => {
    expect(error[key]).toEqual(value);
  });
}
