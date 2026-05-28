/**
 * @file auth-authed.decorator.test.ts
 * @description Tests for Authed decorator
 * @module auth/decorators
 */

import { vi, expect } from "vitest";
import { Extensions } from "@nestjs/graphql";
import { Authed } from "./auth-authed.decorator";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";
import { AuthLevel } from "../auth.types";

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

describe("Authed decorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Extensions with AUTHED auth level", () => {
    Authed();

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.AUTHED }],
      },
    });
  });

  it("should return a decorator function", () => {
    const decorator = Authed();

    expect(typeof decorator).toBe("function");
  });
});
