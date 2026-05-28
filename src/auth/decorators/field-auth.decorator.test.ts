/**
 * @file field-auth.decorator.test.ts
 * @description Tests for FieldAuth decorator
 * @module auth/decorators
 */

import { vi, expect } from "vitest";
import { Extensions } from "@nestjs/graphql";
import { FieldAuth, FIELD_AUTH_EXTENSION_KEY } from "./field-auth.decorator";
import { AuthLevel, FieldPermissions } from "../auth.types";

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

describe("FieldAuth decorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export FIELD_AUTH_EXTENSION_KEY constant", () => {
    expect(FIELD_AUTH_EXTENSION_KEY).toBe("fieldAuth");
  });

  it("should call Extensions with read permissions", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.AUTHED],
    };

    FieldAuth(permissions);

    expect(Extensions).toHaveBeenCalledWith({
      [FIELD_AUTH_EXTENSION_KEY]: permissions,
    });
  });

  it("should call Extensions with write permissions", () => {
    const permissions: FieldPermissions = {
      write: [AuthLevel.OWNER],
    };

    FieldAuth(permissions);

    expect(Extensions).toHaveBeenCalledWith({
      [FIELD_AUTH_EXTENSION_KEY]: permissions,
    });
  });

  it("should call Extensions with combined permissions", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.AUTHED],
      write: [AuthLevel.OWNER],
      delete: [AuthLevel.GROUPS],
      groups: ["ADMINS"],
      ownerField: "createdById",
    };

    FieldAuth(permissions);

    expect(Extensions).toHaveBeenCalledWith({
      [FIELD_AUTH_EXTENSION_KEY]: permissions,
    });
  });

  it("should call Extensions with empty permissions object", () => {
    const permissions: FieldPermissions = {};

    FieldAuth(permissions);

    expect(Extensions).toHaveBeenCalledWith({
      [FIELD_AUTH_EXTENSION_KEY]: permissions,
    });
  });

  it("should return a decorator function", () => {
    const decorator = FieldAuth({ read: [AuthLevel.PUBLIC] });

    expect(typeof decorator).toBe("function");
  });

  it("should handle multiple auth levels for a single permission", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.PUBLIC, AuthLevel.AUTHED],
    };

    FieldAuth(permissions);

    expect(Extensions).toHaveBeenCalledWith({
      [FIELD_AUTH_EXTENSION_KEY]: permissions,
    });
  });
});
