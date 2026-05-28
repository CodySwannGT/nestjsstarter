/**
 * @file auth-public.decorator.test.ts
 * @description Tests for Public decorator
 * @module auth/decorators
 */

import { vi, expect } from "vitest";
import { Extensions } from "@nestjs/graphql";
import { Public, AUTH_EXTENSION_KEY } from "./auth-public.decorator";
import { AuthLevel } from "../auth.types";

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

describe("Public decorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export AUTH_EXTENSION_KEY constant", () => {
    expect(AUTH_EXTENSION_KEY).toBe("auth");
  });

  it("should call Extensions with PUBLIC auth level", () => {
    Public();

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.PUBLIC }],
      },
    });
  });

  it("should return a decorator function", () => {
    const decorator = Public();

    expect(typeof decorator).toBe("function");
  });
});
