/**
 * @file authentication-result-with-message.type.test.ts
 * @description Unit tests for AuthenticationResultWithMessage GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { AuthenticationResult } from "./authentication-result.type";
import { AuthenticationResultWithMessage } from "./authentication-result-with-message.type";

describe("AuthenticationResultWithMessage", () => {
  it("should be a class that can be instantiated", () => {
    const result = new AuthenticationResultWithMessage();

    expect(result).toBeInstanceOf(AuthenticationResultWithMessage);
  });

  it("should have message property", () => {
    const result = new AuthenticationResultWithMessage();
    result.message = "Authentication successful";

    expect(result.message).toBe("Authentication successful");
  });

  it("should have data property as AuthenticationResult", () => {
    const result = new AuthenticationResultWithMessage();
    const authResult = new AuthenticationResult();
    authResult.accessToken = "access-token-123";
    authResult.expiresIn = 3600;
    authResult.tokenType = "Bearer";

    result.data = authResult;

    expect(result.data).toBe(authResult);
    expect(result.data.accessToken).toBe("access-token-123");
    expect(result.data.expiresIn).toBe(3600);
    expect(result.data.tokenType).toBe("Bearer");
  });

  it("should allow all properties to be undefined when nullable", () => {
    const result = new AuthenticationResultWithMessage();

    expect(result.data).toBeUndefined();
    expect(result.message).toBeUndefined();
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

      return storage.metadataByTargetCollection.get(
        AuthenticationResultWithMessage
      ).fields.all;
    };

    it("should register data field with AuthenticationResult type", () => {
      const field = getFields().find(f => f.name === "data");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(AuthenticationResult);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register message field with String type", () => {
      const field = getFields().find(f => f.name === "message");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });
  });
});
