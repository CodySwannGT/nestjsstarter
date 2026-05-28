/**
 * @file auth-groups.decorator.test.ts
 * @description Tests for Groups decorator
 * @module auth/decorators
 */

import { vi, expect } from "vitest";
import { Extensions } from "@nestjs/graphql";
import { Groups } from "./auth-groups.decorator";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";
import { AuthLevel } from "../auth.types";

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

describe("Groups decorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Extensions with GROUPS auth level and single group", () => {
    Groups("ADMINS");

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.GROUPS, groups: ["ADMINS"] }],
      },
    });
  });

  it("should call Extensions with multiple groups", () => {
    Groups("ADMINS", "MODERATORS");

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.GROUPS, groups: ["ADMINS", "MODERATORS"] }],
      },
    });
  });

  it("should call Extensions with empty groups array when no groups provided", () => {
    Groups();

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [{ allow: AuthLevel.GROUPS, groups: [] }],
      },
    });
  });

  it("should return a decorator function", () => {
    const decorator = Groups("USERS");

    expect(typeof decorator).toBe("function");
  });

  it("should accept three or more groups", () => {
    Groups("ADMINS", "MODERATORS", "USERS");

    expect(Extensions).toHaveBeenCalledWith({
      [AUTH_EXTENSION_KEY]: {
        rules: [
          {
            allow: AuthLevel.GROUPS,
            groups: ["ADMINS", "MODERATORS", "USERS"],
          },
        ],
      },
    });
  });
});
