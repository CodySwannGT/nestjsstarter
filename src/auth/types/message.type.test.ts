/**
 * @file message.type.test.ts
 * @description Unit tests for Message GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { Message } from "./message.type";

describe("Message", () => {
  it("should be a class that can be instantiated", () => {
    const result = new Message();

    expect(result).toBeInstanceOf(Message);
  });

  it("should have message property", () => {
    const result = new Message();
    result.message = "Operation completed successfully";

    expect(result.message).toBe("Operation completed successfully");
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

      return storage.metadataByTargetCollection.get(Message).fields.all;
    };

    it("should register message field with String type", () => {
      const field = getFields().find(f => f.name === "message");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register message field as non-nullable", () => {
      const field = getFields().find(f => f.name === "message");

      expect(field?.options?.nullable).toBeUndefined();
    });
  });
});
