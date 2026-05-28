/**
 * @file auth-owner.decorator.test.ts
 * @description Tests for Owner decorator
 * @module auth/decorators
 */

import { vi, expect } from "vitest";
import { Extensions } from "@nestjs/graphql";
import { Owner } from "./auth-owner.decorator";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";
import { AuthLevel } from "../auth.types";

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

describe("Owner decorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Extensions with OWNER auth level and default ownerField", () => {
    Owner();

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.OWNER, ownerField: "ownerId" }],
      },
    });
  });

  it("should call Extensions with custom ownerField", () => {
    Owner("createdById");

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.OWNER, ownerField: "createdById" }],
      },
    });
  });

  it("should return a decorator function", () => {
    const decorator = Owner();

    expect(typeof decorator).toBe("function");
  });

  it("should accept userId as ownerField", () => {
    Owner("userId");

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.OWNER, ownerField: "userId" }],
      },
    });
  });
});
