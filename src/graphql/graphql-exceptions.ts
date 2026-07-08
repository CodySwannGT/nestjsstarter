/**
 * @file graphql-exceptions.ts
 * @description Custom GraphQL error classes with standardized error codes
 * @module graphql
 */

import { GraphQLError, GraphQLErrorOptions } from "graphql";

/**
 * Base class for custom GraphQL errors with standardized error codes
 * @description Extends GraphQLError to include a custom error code in extensions.
 * This provides consistent error handling across the API by allowing clients
 * to distinguish between different error types without parsing error messages.
 */
class CustomError extends GraphQLError {
  /**
   * Constructs a custom GraphQL error with an error code
   * @param message - Human-readable error message for the client
   * @param code - Machine-readable error code (e.g., "NOT_FOUND_EXCEPTION")
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, code: string, options?: GraphQLErrorOptions) {
    super(message, {
      ...options,
      extensions: {
        ...options?.extensions,
        code,
      },
    });
  }
}

/**
 * Error thrown when a requested resource is not found
 * @description Used for 404-like scenarios in GraphQL queries and mutations.
 * Maps to "NOT_FOUND_EXCEPTION" error code for client-side handling.
 */
export class NotFoundError extends CustomError {
  /**
   * Constructs a NotFoundError
   * @param message - Human-readable error message (e.g., "User not found")
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "NOT_FOUND_EXCEPTION", options);
  }
}

/**
 * Error thrown when a request contains invalid or malformed data
 * @description Used for validation failures and bad input in GraphQL operations.
 * Maps to "BAD_REQUEST_EXCEPTION" error code for client-side handling.
 */
export class BadRequestError extends CustomError {
  /**
   * Constructs a BadRequestError
   * @param message - Human-readable error message describing the validation failure
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "BAD_REQUEST_EXCEPTION", options);
  }
}

/**
 * Error thrown when Cognito authentication service fails
 * @description Wraps AWS Cognito errors for consistent GraphQL error handling.
 * Maps to "COGNITO_IDENTITY_PROVIDER_SERVICE_EXCEPTION" for client-side handling.
 */
export class CognitoError extends CustomError {
  /**
   * Constructs a CognitoError
   * @param message - Human-readable error message from Cognito operation
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "COGNITO_IDENTITY_PROVIDER_SERVICE_EXCEPTION", options);
  }
}

/**
 * Error thrown when an external HTTP API call fails
 * @description Wraps HTTP client errors for consistent GraphQL error handling.
 * Maps to "HTTP_CLIENT_EXCEPTION" for client-side handling.
 */
export class HttpClientError extends CustomError {
  /**
   * Constructs an HttpClientError
   * @param message - Human-readable error message from HTTP operation
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "HTTP_CLIENT_EXCEPTION", options);
  }
}

/**
 * Error thrown when an operation exceeds its timeout
 * @description Used when long-running operations fail to complete within allowed time.
 * Maps to "TIME_OUT_EXCEPTION" for client-side handling.
 */
export class TimeOutError extends CustomError {
  /**
   * Constructs a TimeOutError
   * @param message - Human-readable error message indicating timeout
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "TIME_OUT_EXCEPTION", options);
  }
}

/**
 * Error thrown when a request lacks valid authentication credentials
 * @description Used for unauthenticated requests. Maps to "UNAUTHORIZED_EXCEPTION" error code.
 * @remarks Thrown when request lacks a valid JWT token or the token is invalid/expired
 */
export class UnauthorizedError extends GraphQLError {
  /**
   * Constructs an UnauthorizedError
   * @param message - Human-readable error message (defaults to "Not authorized")
   */
  constructor(message = "Not authorized") {
    super(message, {
      extensions: {
        code: "UNAUTHORIZED_EXCEPTION",
      },
    });
    Object.defineProperty(this, "name", { value: "UnauthorizedError" });
  }
}

/**
 * Error thrown when an authenticated user lacks required permissions
 * @description Used for 403-like scenarios in GraphQL operations.
 * Maps to "FORBIDDEN_EXCEPTION" error code for client-side handling.
 */
export class ForbiddenError extends CustomError {
  /**
   * Constructs a ForbiddenError
   * @param message - Human-readable error message explaining permission denial
   * @param options - Optional GraphQL error options for additional metadata
   */
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "FORBIDDEN_EXCEPTION", options);
  }
}

/**
 * Structural shape of an HTTP-client error (axios-compatible)
 * @description Typed structurally so no HTTP-client library is required as a
 * dependency — an `AxiosError` (or any error exposing `message`/`code` and an
 * optional `response` with `status`/`statusText`/`data`) satisfies it.
 */
export interface HttpErrorLike {
  /** Human-readable error message from the HTTP client */
  readonly message: string;
  /** Client-level error code (e.g. "ERR_NETWORK") */
  readonly code?: string;
  /** The HTTP response, when the request reached the server */
  readonly response?: {
    /** HTTP status code (e.g. 400) */
    readonly status?: number;
    /** HTTP status text (e.g. "Bad Request") */
    readonly statusText?: string;
    /** Response body payload */
    readonly data?: unknown;
  };
}

/**
 * Converts HTTP client errors (e.g. Axios errors) into HttpClientError exceptions
 * @description Extracts status codes, response data, and other details from the
 * error and wraps them in HttpClientError for consistent error handling in the
 * GraphQL API. Typed structurally against {@link HttpErrorLike} so it works
 * with any HTTP client without adding a dependency.
 * @param error - The HTTP client error to handle
 * @param message - A descriptive message for the resulting error
 * @returns Never returns — declared as `never` so it can terminate error pipelines (e.g. RxJS `catchError`)
 * @throws {HttpClientError} Always throws with the error details
 */
export function handleAxiosError(error: HttpErrorLike, message: string): never {
  throw new HttpClientError(message, {
    extensions: {
      originalError: {
        message: error.message,
        code: error.code,
        error: error.response?.statusText,
        statusCode: error.response?.status,
        data: error.response?.data,
      },
    },
  });
}
