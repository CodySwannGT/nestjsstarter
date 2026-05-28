/**
 * @file confirm-sign-in.input.test.ts
 * @description Unit tests for ConfirmSignInInput GraphQL input type
 * @module auth/inputs
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { ConfirmSignInInput } from "./confirm-sign-in.input";

describe("ConfirmSignInInput", () => {
  it("should be a class that can be instantiated", () => {
    const input = new ConfirmSignInInput();

    expect(input).toBeInstanceOf(ConfirmSignInInput);
  });

  it("should have all required properties", () => {
    const input = new ConfirmSignInInput();
    input.otpCode = "123456";
    input.identifier = "test@example.com";
    input.session = "session-token";

    expect(input.otpCode).toBe("123456");
    expect(input.identifier).toBe("test@example.com");
    expect(input.session).toBe("session-token");
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

      return storage.metadataByTargetCollection.get(ConfirmSignInInput).fields
        .all;
    };

    it("should register otpCode field with String type", () => {
      const field = getFields().find(f => f.name === "otpCode");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register identifier field with String type", () => {
      const field = getFields().find(f => f.name === "identifier");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register session field with String type", () => {
      const field = getFields().find(f => f.name === "session");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register all fields as non-nullable", () => {
      const otpCodeField = getFields().find(f => f.name === "otpCode");
      const identifierField = getFields().find(f => f.name === "identifier");
      const sessionField = getFields().find(f => f.name === "session");

      expect(otpCodeField?.options?.nullable).toBeUndefined();
      expect(identifierField?.options?.nullable).toBeUndefined();
      expect(sessionField?.options?.nullable).toBeUndefined();
    });
  });
});
