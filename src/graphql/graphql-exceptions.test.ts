/**
 * @file graphql-exceptions.test.ts
 * @description Unit tests for the coded GraphQL error hierarchy
 * @module graphql
 */

import { expect } from "vitest";
import {
  BadRequestError,
  CognitoError,
  ForbiddenError,
  HttpClientError,
  NotFoundError,
  TimeOutError,
  UnauthorizedError,
  handleAxiosError,
} from "./graphql-exceptions";
import type { HttpErrorLike } from "./graphql-exceptions";

describe("graphql-exceptions", () => {
  describe("NotFoundError", () => {
    it("should create error with NOT_FOUND_EXCEPTION code", () => {
      const error = new NotFoundError("Item not found");

      expect(error.message).toBe("Item not found");
      expect(error.extensions?.code).toBe("NOT_FOUND_EXCEPTION");
    });

    it("should merge extra extensions while preserving code", () => {
      const error = new NotFoundError("Not found", {
        extensions: { resourceId: "item-1" },
      });

      expect(error.extensions?.code).toBe("NOT_FOUND_EXCEPTION");
      expect(error.extensions?.resourceId).toBe("item-1");
    });

    it("should not allow caller to override NOT_FOUND_EXCEPTION code", () => {
      const error = new NotFoundError("Not found", {
        extensions: { code: "OVERRIDE" },
      });

      expect(error.extensions?.code).toBe("NOT_FOUND_EXCEPTION");
    });
  });

  describe("BadRequestError", () => {
    it("should create error with BAD_REQUEST_EXCEPTION code", () => {
      const error = new BadRequestError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.extensions?.code).toBe("BAD_REQUEST_EXCEPTION");
    });

    it("should merge extra extensions while preserving code", () => {
      const error = new BadRequestError("Bad input", {
        extensions: { field: "email" },
      });

      expect(error.extensions?.code).toBe("BAD_REQUEST_EXCEPTION");
      expect(error.extensions?.field).toBe("email");
    });
  });

  describe("CognitoError", () => {
    it("should create error with COGNITO_IDENTITY_PROVIDER_SERVICE_EXCEPTION code", () => {
      const error = new CognitoError("Auth failed");

      expect(error.message).toBe("Auth failed");
      expect(error.extensions?.code).toBe(
        "COGNITO_IDENTITY_PROVIDER_SERVICE_EXCEPTION"
      );
    });
  });

  describe("HttpClientError", () => {
    it("should create error with HTTP_CLIENT_EXCEPTION code", () => {
      const error = new HttpClientError("External API unavailable");

      expect(error.message).toBe("External API unavailable");
      expect(error.extensions?.code).toBe("HTTP_CLIENT_EXCEPTION");
    });

    it("should merge extra extensions while preserving code", () => {
      const error = new HttpClientError("API failed", {
        extensions: { endpoint: "/items" },
      });

      expect(error.extensions?.code).toBe("HTTP_CLIENT_EXCEPTION");
      expect(error.extensions?.endpoint).toBe("/items");
    });
  });

  describe("TimeOutError", () => {
    it("should create error with TIME_OUT_EXCEPTION code", () => {
      const error = new TimeOutError("Operation timed out after 30s");

      expect(error.message).toBe("Operation timed out after 30s");
      expect(error.extensions?.code).toBe("TIME_OUT_EXCEPTION");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create error with UNAUTHORIZED_EXCEPTION code and default message", () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe("Not authorized");
      expect(error.extensions?.code).toBe("UNAUTHORIZED_EXCEPTION");
    });

    it("should accept a custom message", () => {
      const error = new UnauthorizedError("Token expired");

      expect(error.message).toBe("Token expired");
      expect(error.extensions?.code).toBe("UNAUTHORIZED_EXCEPTION");
    });

    it("should expose 'UnauthorizedError' as the error name", () => {
      const error = new UnauthorizedError();

      // UnauthorizedError explicitly sets `name` via Object.defineProperty so
      // error-handling middleware can distinguish it from a plain GraphQLError.
      expect(error.name).toBe("UnauthorizedError");
    });
  });

  describe("ForbiddenError", () => {
    it("should create error with FORBIDDEN_EXCEPTION code", () => {
      const error = new ForbiddenError("Access denied");

      expect(error.message).toBe("Access denied");
      expect(error.extensions?.code).toBe("FORBIDDEN_EXCEPTION");
    });

    it("should accept GraphQL error options", () => {
      const error = new ForbiddenError("No permission", {
        extensions: { resource: "item" },
      });

      expect(error.extensions?.code).toBe("FORBIDDEN_EXCEPTION");
      expect(error.extensions?.resource).toBe("item");
    });
  });

  describe("handleAxiosError", () => {
    /**
     * Structural stand-in for an AxiosError carrying an HTTP response —
     * exactly the shape {@link HttpErrorLike} accepts, so no HTTP-client
     * dependency is needed to exercise the helper.
     */
    const responseError: HttpErrorLike = {
      message: "Request failed",
      code: "ERR_BAD_REQUEST",
      response: {
        status: 400,
        statusText: "Bad Request",
        data: { detail: "Invalid input" },
      },
    };

    /** Structural stand-in for a network-level error with no HTTP response. */
    const networkError: HttpErrorLike = {
      message: "Network Error",
      code: "ERR_NETWORK",
    };

    /**
     * Invoke the helper and capture the HttpClientError it throws.
     * @param error - The HTTP-error-like input.
     * @param message - The caller-facing message.
     * @returns The caught HttpClientError.
     */
    const catchHandled = (
      error: HttpErrorLike,
      message: string
    ): HttpClientError => {
      try {
        handleAxiosError(error, message);
      } catch (caught) {
        return caught as HttpClientError;
      }
      throw new Error("handleAxiosError did not throw");
    };

    it("throws with the caller-supplied message", () => {
      expect(() => handleAxiosError(responseError, "API call failed")).toThrow(
        "API call failed"
      );
    });

    it("attaches HTTP_CLIENT_EXCEPTION code and HTTP response details to extensions", () => {
      const caughtError = catchHandled(responseError, "API call failed");

      expect(caughtError).toBeInstanceOf(HttpClientError);
      expect(caughtError.extensions?.code).toBe("HTTP_CLIENT_EXCEPTION");
      const originalError = caughtError.extensions?.originalError as {
        statusCode?: number;
        error?: string;
        data?: { detail?: string };
      };
      expect(originalError.statusCode).toBe(400);
      expect(originalError.error).toBe("Bad Request");
      expect(originalError.data?.detail).toBe("Invalid input");
    });

    it("captures the error message and code in originalError when no HTTP response is present", () => {
      const caughtError = catchHandled(networkError, "Connection failed");

      expect(caughtError.message).toBe("Connection failed");
      const originalError = caughtError.extensions?.originalError as {
        message?: string;
        code?: string;
      };
      expect(originalError.message).toBe("Network Error");
      expect(originalError.code).toBe("ERR_NETWORK");
    });

    it("omits statusCode and statusText in originalError when there is no HTTP response", () => {
      const caughtError = catchHandled(networkError, "Connection failed");

      const originalError = caughtError.extensions?.originalError as {
        statusCode?: number;
        error?: string;
      };
      expect(originalError.statusCode).toBeUndefined();
      expect(originalError.error).toBeUndefined();
    });
  });
});
