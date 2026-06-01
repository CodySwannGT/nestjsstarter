/**
 * @file auth.transformer.helpers.test.ts
 * @description Unit tests for the exported pure authorization helper functions
 * in auth.transformer.ts (checkAuthRule, checkFieldPermission, hasPublicAccess,
 * getAuthExtension, getFieldAuthExtension). These exercise the rule-evaluation
 * branches directly rather than through schema transformation.
 * @module auth
 */

import { expect } from "vitest";

import {
  checkAuthRule,
  checkFieldPermission,
  hasPublicAccess,
  getAuthExtension,
  getFieldAuthExtension,
} from "./auth.transformer";
import {
  AuthLevel,
  AuthUser,
  FieldPermissions,
  Permission,
} from "./auth.types";
import { AUTH_EXTENSION_KEY } from "./decorators/auth-public.decorator";
import { FIELD_AUTH_EXTENSION_KEY } from "./decorators/field-auth.decorator";

/** Reusable test user with a single group membership */
const GROUPED_USER: AuthUser = {
  id: "u-1",
  sub: "u-1",
  groups: ["ADMINS"],
};

describe("checkAuthRule", () => {
  it("returns true for PUBLIC regardless of user", () => {
    expect(checkAuthRule(undefined, { allow: AuthLevel.PUBLIC })).toBe(true);
    expect(checkAuthRule(GROUPED_USER, { allow: AuthLevel.PUBLIC })).toBe(true);
  });

  it("returns true for AUTHED only when a user is present", () => {
    expect(checkAuthRule(GROUPED_USER, { allow: AuthLevel.AUTHED })).toBe(true);
    expect(checkAuthRule(undefined, { allow: AuthLevel.AUTHED })).toBe(false);
  });

  it("returns true for OWNER only when user id matches resource owner id", () => {
    expect(
      checkAuthRule(
        { id: "owner-1", sub: "owner-1" },
        { allow: AuthLevel.OWNER },
        "owner-1"
      )
    ).toBe(true);
  });

  it("returns false for OWNER when user id does not match resource owner id", () => {
    expect(
      checkAuthRule(
        { id: "other", sub: "other" },
        { allow: AuthLevel.OWNER },
        "owner-1"
      )
    ).toBe(false);
  });

  it("returns false for OWNER when no resource owner id is supplied", () => {
    expect(
      checkAuthRule(
        { id: "owner-1", sub: "owner-1" },
        { allow: AuthLevel.OWNER }
      )
    ).toBe(false);
  });

  it("returns false for OWNER when no user is present", () => {
    expect(
      checkAuthRule(undefined, { allow: AuthLevel.OWNER }, "owner-1")
    ).toBe(false);
  });

  it("returns true for GROUPS when user belongs to one of the rule groups", () => {
    expect(
      checkAuthRule(GROUPED_USER, {
        allow: AuthLevel.GROUPS,
        groups: ["ADMINS"],
      })
    ).toBe(true);
  });

  it("returns false for GROUPS when user belongs to none of the rule groups", () => {
    expect(
      checkAuthRule(GROUPED_USER, { allow: AuthLevel.GROUPS, groups: ["MODS"] })
    ).toBe(false);
  });

  it("returns false for GROUPS when the rule omits a groups list", () => {
    expect(checkAuthRule(GROUPED_USER, { allow: AuthLevel.GROUPS })).toBe(
      false
    );
  });

  it("returns false for GROUPS when no user is present", () => {
    expect(
      checkAuthRule(undefined, { allow: AuthLevel.GROUPS, groups: ["ADMINS"] })
    ).toBe(false);
  });

  it("returns false for GROUPS when the user has no groups property", () => {
    expect(
      checkAuthRule(
        { id: "u-2", sub: "u-2" },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] }
      )
    ).toBe(false);
  });

  it("returns false for an unknown auth level (default branch)", () => {
    expect(checkAuthRule(GROUPED_USER, { allow: "unknown" as AuthLevel })).toBe(
      false
    );
  });
});

describe("checkFieldPermission", () => {
  it("returns false when the requested permission has no allowed levels", () => {
    const permissions: FieldPermissions = { read: [AuthLevel.AUTHED] };
    // WRITE is not configured -> allowedLevels is undefined
    expect(
      checkFieldPermission(GROUPED_USER, permissions, Permission.WRITE)
    ).toBe(false);
  });

  it("returns false when the requested permission is an empty array", () => {
    const permissions: FieldPermissions = { read: [] };
    expect(
      checkFieldPermission(GROUPED_USER, permissions, Permission.READ)
    ).toBe(false);
  });

  it("returns true when the user satisfies an allowed AUTHED level", () => {
    const permissions: FieldPermissions = { read: [AuthLevel.AUTHED] };
    expect(
      checkFieldPermission(GROUPED_USER, permissions, Permission.READ)
    ).toBe(true);
  });

  it("returns true for OWNER level when owner id matches the resource owner", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.OWNER],
      ownerField: "ownerId",
    };
    expect(
      checkFieldPermission(
        { id: "owner-9", sub: "owner-9" },
        permissions,
        Permission.READ,
        "owner-9"
      )
    ).toBe(true);
  });

  it("returns false for OWNER level when owner id does not match", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.OWNER],
      ownerField: "ownerId",
    };
    expect(
      checkFieldPermission(
        { id: "nope", sub: "nope" },
        permissions,
        Permission.READ,
        "owner-9"
      )
    ).toBe(false);
  });

  it("passes the rule groups through to the underlying check (GROUPS level)", () => {
    const permissions: FieldPermissions = {
      write: [AuthLevel.GROUPS],
      groups: ["ADMINS"],
    };
    expect(
      checkFieldPermission(GROUPED_USER, permissions, Permission.WRITE)
    ).toBe(true);
  });
});

describe("hasPublicAccess", () => {
  it("returns true when at least one rule is PUBLIC", () => {
    expect(
      hasPublicAccess([
        { allow: AuthLevel.AUTHED },
        { allow: AuthLevel.PUBLIC },
      ])
    ).toBe(true);
  });

  it("returns false when no rule is PUBLIC", () => {
    expect(
      hasPublicAccess([
        { allow: AuthLevel.AUTHED },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ])
    ).toBe(false);
  });

  it("returns false for an empty rules array", () => {
    expect(hasPublicAccess([])).toBe(false);
  });
});

describe("getAuthExtension / getFieldAuthExtension", () => {
  it("getAuthExtension returns undefined when extensions are undefined", () => {
    expect(getAuthExtension(undefined)).toBeUndefined();
  });

  it("getAuthExtension returns the stored extension when present", () => {
    const ext = {
      [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] },
    };
    expect(getAuthExtension(ext)).toEqual({
      rules: [{ allow: AuthLevel.PUBLIC }],
    });
  });

  it("getFieldAuthExtension returns undefined when extensions are undefined", () => {
    expect(getFieldAuthExtension(undefined)).toBeUndefined();
  });

  it("getFieldAuthExtension returns the stored permissions when present", () => {
    const permissions: FieldPermissions = { read: [AuthLevel.AUTHED] };
    const ext = { [FIELD_AUTH_EXTENSION_KEY]: permissions };
    expect(getFieldAuthExtension(ext)).toEqual(permissions);
  });
});
