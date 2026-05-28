/**
 * @file auth.transformer.test.ts
 * @description Unit tests for zero-trust authorization transformer using extensions
 * @module auth
 */

import { vi, expect } from "vitest";

import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import {
  authExtensionTransformer,
  fieldAuthExtensionTransformer,
  AuthErrorCode,
} from "./auth.transformer";
import { AuthLevel, AuthRule, FieldPermissions } from "./auth.types";
import { AUTH_EXTENSION_KEY } from "./decorators/auth-public.decorator";
import { FIELD_AUTH_EXTENSION_KEY } from "./decorators/field-auth.decorator";

/** Test constants to avoid string duplication */
const TEST_VALUE = "test-value";
const TEST_USER_ID = "user-123";
const NOT_AUTHORIZED_MSG = "Not authorized";
const SECRET_VALUE = "secret-value";
const OWNER_FIELD = "ownerId";

/**
 * Creates a mock schema for testing operation-level auth
 * @param fieldName - Name of the test field
 * @param rules - Auth rules array (or undefined for no extension)
 * @returns Mock GraphQL schema
 */
function createMockSchema(
  fieldName: string,
  rules?: readonly AuthRule[]
): GraphQLSchema {
  const queryType = new GraphQLObjectType({
    name: "Query",
    fields: {
      [fieldName]: {
        type: GraphQLString,
        resolve: () => TEST_VALUE,
        extensions: rules ? { [AUTH_EXTENSION_KEY]: { rules } } : {},
      },
    },
  });

  return new GraphQLSchema({ query: queryType });
}

/**
 * Creates a mock schema for testing field-level auth
 * @param typeName - Name of the object type
 * @param fieldName - Name of the field
 * @param permissions - Field permissions object
 * @returns Mock GraphQL schema with nested type
 */
function createFieldAuthSchema(
  typeName: string,
  fieldName: string,
  permissions: FieldPermissions
): GraphQLSchema {
  const objectType = new GraphQLObjectType({
    name: typeName,
    fields: {
      [fieldName]: {
        type: GraphQLString,
        resolve: source => source[fieldName],
        extensions: { [FIELD_AUTH_EXTENSION_KEY]: permissions },
      },
    },
  });

  const queryType = new GraphQLObjectType({
    name: "Query",
    fields: {
      getItem: {
        type: objectType,
        resolve: () => ({ [fieldName]: SECRET_VALUE, ownerId: TEST_USER_ID }),
        extensions: {
          [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] },
        },
      },
    },
  });

  return new GraphQLSchema({ query: queryType });
}

describe("authExtensionTransformer", () => {
  describe("deny-by-default", () => {
    it("should throw error for operations without auth extension", () => {
      const schema = createMockSchema("unprotected");

      expect(() => authExtensionTransformer(schema)).toThrow("MISSING_AUTH");
    });

    it("should include helpful message in error", () => {
      const schema = createMockSchema("unprotected");

      expect(() => authExtensionTransformer(schema)).toThrow(
        /Use @Public\(\) for public access/
      );
    });
  });

  describe("public auth", () => {
    it("should allow public operations without user", async () => {
      const rules = [{ allow: AuthLevel.PUBLIC }] as const;
      const schema = createMockSchema("publicField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["publicField"];
      const context = { req: {} };

      const result = await field?.resolve?.(null, {}, context, {} as never);
      expect(result).toBe(TEST_VALUE);
    });

    it("should not wrap resolver for public operations", () => {
      const rules = [{ allow: AuthLevel.PUBLIC }] as const;
      const schema = createMockSchema("publicField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["publicField"];

      // Public fields should return the original fieldConfig unchanged
      // (the resolve function should be the original, not wrapped)
      expect(field?.resolve?.toString()).not.toContain("authorized");
    });
  });

  describe("authed auth", () => {
    it("should reject authed operations without user", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = { req: {} };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toThrow(NOT_AUTHORIZED_MSG);
    });

    it("should allow authed operations with valid user", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = {
        req: { user: { id: TEST_USER_ID, sub: TEST_USER_ID } },
      };

      const result = await field?.resolve?.(null, {}, context, {} as never);
      expect(result).toBe(TEST_VALUE);
    });

    it("should include error code in UnauthorizedError", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = { req: {} };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toMatchObject({
        code: AuthErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe("owner auth at operation level", () => {
    it("should log warning when owner auth is used at operation level", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: OWNER_FIELD },
      ] as const;
      const schema = createMockSchema("ownerField", rules);

      authExtensionTransformer(schema);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("OWNER auth should be used at field level")
      );
      consoleSpy.mockRestore();
    });

    it("should filter out owner rules at operation level", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: OWNER_FIELD },
      ] as const;
      const schema = createMockSchema("ownerOnlyField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["ownerOnlyField"];

      // Even with a valid user, owner-only auth at operation level should fail
      // because owner rules are filtered out
      const context = {
        req: { user: { id: TEST_USER_ID, sub: TEST_USER_ID } },
      };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toThrow(NOT_AUTHORIZED_MSG);
      consoleSpy.mockRestore();
    });

    it("should allow access via fallback rules when owner is combined with other auth", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: OWNER_FIELD },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ] as const;
      const schema = createMockSchema("ownerOrAdminField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["ownerOrAdminField"];

      // Admin can access via groups rule (owner rule is filtered out)
      const adminContext = {
        req: { user: { id: "admin-1", sub: "admin-1", groups: ["ADMINS"] } },
      };

      const result = await field?.resolve?.(
        null,
        {},
        adminContext,
        {} as never
      );
      expect(result).toBe(TEST_VALUE);
      consoleSpy.mockRestore();
    });
  });

  describe("groups auth", () => {
    it("should check group membership for groups auth", async () => {
      const rules = [{ allow: AuthLevel.GROUPS, groups: ["ADMINS"] }] as const;
      const schema = createMockSchema("adminField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["adminField"];

      // User is admin
      const adminContext = {
        req: { user: { id: "admin-1", sub: "admin-1", groups: ["ADMINS"] } },
      };

      const result = await field?.resolve?.(
        null,
        {},
        adminContext,
        {} as never
      );
      expect(result).toBe(TEST_VALUE);

      // User is not admin
      const userContext = {
        req: { user: { id: "user-1", sub: "user-1", groups: ["USERS"] } },
      };

      await expect(
        field?.resolve?.(null, {}, userContext, {} as never)
      ).rejects.toThrow(NOT_AUTHORIZED_MSG);
    });

    it("should allow access if user is in any of the specified groups", async () => {
      const rules = [
        { allow: AuthLevel.GROUPS, groups: ["ADMINS", "MODERATORS"] },
      ] as const;
      const schema = createMockSchema("modField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["modField"];

      // User is moderator (not admin, but allowed)
      const modContext = {
        req: { user: { id: "mod-1", sub: "mod-1", groups: ["MODERATORS"] } },
      };

      const result = await field?.resolve?.(null, {}, modContext, {} as never);
      expect(result).toBe(TEST_VALUE);
    });
  });

  describe("multiple rules", () => {
    it("should pass if any applicable rule matches", async () => {
      const rules = [
        { allow: AuthLevel.AUTHED },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ] as const;
      const schema = createMockSchema("multiRuleField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["multiRuleField"];

      // Regular user can access via AUTHED rule
      const userContext = {
        req: { user: { id: "user-1", sub: "user-1", groups: ["USERS"] } },
      };

      const result = await field?.resolve?.(null, {}, userContext, {} as never);
      expect(result).toBe(TEST_VALUE);
    });
  });
});

describe("fieldAuthExtensionTransformer", () => {
  describe("owner auth at field level", () => {
    it("should allow owner to read protected field", async () => {
      const permissions: FieldPermissions = {
        read: [AuthLevel.OWNER],
        ownerField: OWNER_FIELD,
      };
      const schema = createFieldAuthSchema("Item", "secret", permissions);
      const transformedSchema = fieldAuthExtensionTransformer(schema);

      // Get the Item type and its secret field
      const itemType = transformedSchema.getType("Item") as GraphQLObjectType;
      const secretField = itemType.getFields()["secret"];

      // Owner can read
      const ownerContext = {
        req: { user: { id: TEST_USER_ID, sub: TEST_USER_ID } },
      };
      const source = { secret: SECRET_VALUE, ownerId: TEST_USER_ID };

      const result = await secretField.resolve?.(
        source,
        {},
        ownerContext,
        {} as never
      );
      expect(result).toBe(SECRET_VALUE);
    });

    it("should deny non-owner from reading protected field", async () => {
      const permissions: FieldPermissions = {
        read: [AuthLevel.OWNER],
        ownerField: OWNER_FIELD,
      };
      const schema = createFieldAuthSchema("Item", "secret", permissions);
      const transformedSchema = fieldAuthExtensionTransformer(schema);

      const itemType = transformedSchema.getType("Item") as GraphQLObjectType;
      const secretField = itemType.getFields()["secret"];

      // Non-owner cannot read
      const otherContext = {
        req: { user: { id: "other-user", sub: "other-user" } },
      };
      const source = { secret: SECRET_VALUE, ownerId: TEST_USER_ID };

      await expect(
        secretField.resolve?.(source, {}, otherContext, {} as never)
      ).rejects.toThrow("Not authorized to read field");
    });
  });
});
