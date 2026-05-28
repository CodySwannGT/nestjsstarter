/**
 * @file refresh-token.input.test.ts
 * @description Unit tests for RefreshTokenInput GraphQL input type
 * @module auth/inputs
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { RefreshTokenInput } from "./refresh-token.input";

describe("RefreshTokenInput", () => {
  it("should be a class that can be instantiated", () => {
    const input = new RefreshTokenInput();

    expect(input).toBeInstanceOf(RefreshTokenInput);
  });

  it("should have refreshToken property", () => {
    const input = new RefreshTokenInput();
    input.refreshToken = "refresh-token-value";

    expect(input.refreshToken).toBe("refresh-token-value");
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

      return storage.metadataByTargetCollection.get(RefreshTokenInput).fields
        .all;
    };

    it("should register refreshToken field with String type", () => {
      const field = getFields().find(f => f.name === "refreshToken");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register refreshToken field as non-nullable", () => {
      const field = getFields().find(f => f.name === "refreshToken");

      expect(field?.options?.nullable).toBeUndefined();
    });
  });
});
