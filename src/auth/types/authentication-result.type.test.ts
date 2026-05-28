/**
 * @file authentication-result.type.test.ts
 * @description Unit tests for AuthenticationResult GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { Int } from "@nestjs/graphql";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { AuthenticationResult } from "./authentication-result.type";

describe("AuthenticationResult", () => {
  it("should be a class that can be instantiated", () => {
    const result = new AuthenticationResult();

    expect(result).toBeInstanceOf(AuthenticationResult);
  });

  it("should have accessToken property", () => {
    const result = new AuthenticationResult();
    result.accessToken = "test-access-token-123";

    expect(result.accessToken).toBe("test-access-token-123");
  });

  it("should have expiresIn property as number", () => {
    const result = new AuthenticationResult();
    result.expiresIn = 3600;

    expect(result.expiresIn).toBe(3600);
    expect(typeof result.expiresIn).toBe("number");
  });

  it("should have tokenType property", () => {
    const result = new AuthenticationResult();
    result.tokenType = "Bearer";

    expect(result.tokenType).toBe("Bearer");
  });

  it("should have refreshToken property", () => {
    const result = new AuthenticationResult();
    result.refreshToken = "refresh-token-123";

    expect(result.refreshToken).toBe("refresh-token-123");
  });

  it("should have idToken property", () => {
    const result = new AuthenticationResult();
    result.idToken = "id-token-456";

    expect(result.idToken).toBe("id-token-456");
  });

  it("should allow all properties to be undefined when nullable", () => {
    const result = new AuthenticationResult();

    expect(result.accessToken).toBeUndefined();
    expect(result.expiresIn).toBeUndefined();
    expect(result.tokenType).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    expect(result.idToken).toBeUndefined();
  });

  describe("GraphQL field metadata", () => {
    beforeAll(() => {
      LazyMetadataStorage.load();
    });

    const getFields = () => {
      const storage = TypeMetadataStorage as unknown as {
        metadataByTargetCollection: {
          get: (target: unknown) => {
            fields: {
              all: ReadonlyArray<{
                name: string;
                typeFn: () => unknown;
                options: { nullable?: boolean };
              }>;
            };
          };
        };
      };

      return storage.metadataByTargetCollection.get(AuthenticationResult).fields
        .all;
    };

    it("should register accessToken field with String type", () => {
      const field = getFields().find(f => f.name === "accessToken");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register expiresIn field with Int type", () => {
      const field = getFields().find(f => f.name === "expiresIn");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(Int);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register tokenType field with String type", () => {
      const field = getFields().find(f => f.name === "tokenType");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register refreshToken field with String type", () => {
      const field = getFields().find(f => f.name === "refreshToken");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register idToken field with String type", () => {
      const field = getFields().find(f => f.name === "idToken");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });
  });
});
