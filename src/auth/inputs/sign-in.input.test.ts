/**
 * @file sign-in.input.test.ts
 * @description Unit tests for SignInInput GraphQL input type
 * @module auth/inputs
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { SignInInput } from "./sign-in.input";

describe("SignInInput", () => {
  it("should be a class that can be instantiated", () => {
    const input = new SignInInput();

    expect(input).toBeInstanceOf(SignInInput);
  });

  it("should have identifier property", () => {
    const input = new SignInInput();
    input.identifier = "test@example.com";

    expect(input.identifier).toBe("test@example.com");
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

      return storage.metadataByTargetCollection.get(SignInInput).fields.all;
    };

    it("should register identifier field with String type", () => {
      const field = getFields().find(f => f.name === "identifier");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register identifier field as non-nullable", () => {
      const field = getFields().find(f => f.name === "identifier");

      expect(field?.options?.nullable).toBeUndefined();
    });
  });
});
