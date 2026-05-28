/**
 * @file auth.types.test.ts
 * @description Tests for zero-trust authorization type definitions
 * @module auth
 */

import { expect } from "vitest";
import {
  AuthLevel,
  Permission,
  AuthRule,
  FieldPermissions,
  AuthContext,
  AuthUser,
} from "./auth.types";

const TEST_USER_ID = "user-123";
const TEST_COGNITO_SUB = "cognito-sub-456";

describe("AuthLevel", () => {
  it("should have PUBLIC level", () => {
    expect(AuthLevel.PUBLIC).toBe("public");
  });

  it("should have AUTHED level", () => {
    expect(AuthLevel.AUTHED).toBe("authed");
  });

  it("should have OWNER level", () => {
    expect(AuthLevel.OWNER).toBe("owner");
  });

  it("should have GROUPS level", () => {
    expect(AuthLevel.GROUPS).toBe("groups");
  });
});

describe("Permission", () => {
  it("should have READ permission", () => {
    expect(Permission.READ).toBe("read");
  });

  it("should have WRITE permission", () => {
    expect(Permission.WRITE).toBe("write");
  });

  it("should have DELETE permission", () => {
    expect(Permission.DELETE).toBe("delete");
  });
});

describe("AuthRule", () => {
  it("should accept minimal auth rule with allow only", () => {
    const rule: AuthRule = {
      allow: AuthLevel.PUBLIC,
    };

    expect(rule.allow).toBe(AuthLevel.PUBLIC);
    expect(rule.groups).toBeUndefined();
    expect(rule.ownerField).toBeUndefined();
  });

  it("should accept auth rule with groups", () => {
    const rule: AuthRule = {
      allow: AuthLevel.GROUPS,
      groups: ["ADMINS", "MODERATORS"],
    };

    expect(rule.allow).toBe(AuthLevel.GROUPS);
    expect(rule.groups).toEqual(["ADMINS", "MODERATORS"]);
  });

  it("should accept auth rule with ownerField", () => {
    const rule: AuthRule = {
      allow: AuthLevel.OWNER,
      ownerField: "userId",
    };

    expect(rule.allow).toBe(AuthLevel.OWNER);
    expect(rule.ownerField).toBe("userId");
  });
});

describe("FieldPermissions", () => {
  it("should accept minimal field permissions", () => {
    const permissions: FieldPermissions = {};

    expect(permissions.read).toBeUndefined();
    expect(permissions.write).toBeUndefined();
    expect(permissions.delete).toBeUndefined();
  });

  it("should accept field permissions with read levels", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.AUTHED],
    };

    expect(permissions.read).toEqual([AuthLevel.AUTHED]);
  });

  it("should accept field permissions with multiple levels", () => {
    const permissions: FieldPermissions = {
      read: [AuthLevel.AUTHED, AuthLevel.PUBLIC],
      write: [AuthLevel.OWNER],
      delete: [AuthLevel.GROUPS],
      groups: ["ADMINS"],
      ownerField: "createdById",
    };

    expect(permissions.read).toEqual([AuthLevel.AUTHED, AuthLevel.PUBLIC]);
    expect(permissions.write).toEqual([AuthLevel.OWNER]);
    expect(permissions.delete).toEqual([AuthLevel.GROUPS]);
    expect(permissions.groups).toEqual(["ADMINS"]);
    expect(permissions.ownerField).toBe("createdById");
  });
});

describe("AuthContext", () => {
  it("should accept context without user", () => {
    const context: AuthContext = {
      req: {},
    };

    expect(context.req.user).toBeUndefined();
  });

  it("should accept context with authenticated user", () => {
    const user: AuthUser = {
      id: TEST_USER_ID,
      sub: TEST_COGNITO_SUB,
    };

    const context: AuthContext = {
      req: { user },
    };

    expect(context.req.user).toBe(user);
    expect(context.req.user?.id).toBe(TEST_USER_ID);
    expect(context.req.user?.sub).toBe(TEST_COGNITO_SUB);
  });
});

describe("AuthUser", () => {
  it("should accept minimal user with id and sub", () => {
    const user: AuthUser = {
      id: TEST_USER_ID,
      sub: TEST_COGNITO_SUB,
    };

    expect(user.id).toBe(TEST_USER_ID);
    expect(user.sub).toBe(TEST_COGNITO_SUB);
    expect(user.groups).toBeUndefined();
    expect(user.organizationId).toBeUndefined();
  });

  it("should accept user with groups", () => {
    const user: AuthUser = {
      id: TEST_USER_ID,
      sub: TEST_COGNITO_SUB,
      groups: ["ADMINS", "USERS"],
    };

    expect(user.groups).toEqual(["ADMINS", "USERS"]);
  });

  it("should accept user with organizationId", () => {
    const user: AuthUser = {
      id: TEST_USER_ID,
      sub: TEST_COGNITO_SUB,
      organizationId: "org-789",
    };

    expect(user.organizationId).toBe("org-789");
  });

  it("should accept fully populated user", () => {
    const user: AuthUser = {
      id: TEST_USER_ID,
      sub: TEST_COGNITO_SUB,
      groups: ["ADMINS"],
      organizationId: "org-789",
    };

    expect(user.id).toBe(TEST_USER_ID);
    expect(user.sub).toBe(TEST_COGNITO_SUB);
    expect(user.groups).toEqual(["ADMINS"]);
    expect(user.organizationId).toBe("org-789");
  });
});
