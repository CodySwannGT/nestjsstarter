import { expect } from "vitest";
import { NotFoundException } from "@nestjs/common";
import {
  GraphQLErrorCodes,
  assertErrorResponse,
  captureError,
  createGraphQLError,
  expectGraphQLError,
  mockRejectedPromise,
  mockResolvedPromise,
  testExceptions,
  validateErrorProperties,
} from "./error-test.helpers";

describe("expectGraphQLError", () => {
  it("should pass when the promise rejects with the expected type", async () => {
    const failing = (): Promise<never> =>
      Promise.reject(new NotFoundException("Widget not found"));

    await expectGraphQLError(failing(), NotFoundException);
  });

  it("should match a partial error message", async () => {
    const failing = (): Promise<never> =>
      Promise.reject(new NotFoundException("Widget not found"));

    await expectGraphQLError(failing(), NotFoundException, "not found");
  });
});

describe("createGraphQLError", () => {
  it("should create an error with code and extensions", () => {
    const error = createGraphQLError("Denied", GraphQLErrorCodes.FORBIDDEN, {
      detail: "extra",
    });

    expect(error.message).toBe("Denied");
    expect(error.extensions.code).toBe("FORBIDDEN");
    expect(error.extensions.detail).toBe("extra");
  });
});

describe("testExceptions", () => {
  it("should create exceptions with default messages and statuses", () => {
    expect(testExceptions.badRequest().getStatus()).toBe(400);
    expect(testExceptions.unauthorized().getStatus()).toBe(401);
    expect(testExceptions.forbidden().getStatus()).toBe(403);
    expect(testExceptions.notFound().getStatus()).toBe(404);
    expect(testExceptions.conflict().getStatus()).toBe(409);
  });

  it("should accept custom messages", () => {
    expect(testExceptions.notFound("Widget missing").message).toBe(
      "Widget missing"
    );
  });
});

describe("assertErrorResponse", () => {
  it("should assert status and message", () => {
    assertErrorResponse(
      { status: 404, message: "Widget not found" },
      404,
      "not found"
    );
  });

  it("should fall back to statusCode and response message", () => {
    assertErrorResponse(
      { statusCode: 400, response: { message: "Invalid input" } },
      400,
      "Invalid"
    );
  });
});

describe("mockRejectedPromise", () => {
  it("should create a mock that rejects with the error", async () => {
    const error = new Error("boom");
    const mock = mockRejectedPromise(error);

    await expect(mock()).rejects.toBe(error);
  });
});

describe("mockResolvedPromise", () => {
  it("should create a mock that resolves with the value", async () => {
    const mock = mockResolvedPromise("value");

    await expect(mock()).resolves.toBe("value");
  });
});

describe("captureError", () => {
  it("should capture a thrown error", async () => {
    const error = new Error("captured");

    await expect(captureError(() => Promise.reject(error))).resolves.toBe(
      error
    );
  });

  it("should return null when nothing throws", async () => {
    await expect(
      captureError(() => Promise.resolve("fine"))
    ).resolves.toBeNull();
  });
});

describe("validateErrorProperties", () => {
  it("should assert each expected property", () => {
    validateErrorProperties(
      { code: "CONFLICT", status: 409 },
      { code: "CONFLICT", status: 409 }
    );
  });
});
