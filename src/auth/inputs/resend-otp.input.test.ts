/**
 * @file resend-otp.input.test.ts
 * @description Unit tests for ResendOtpInput GraphQL input type
 * @module auth/inputs
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { ResendOtpInput } from "./resend-otp.input";

describe("ResendOtpInput", () => {
  it("should be a class that can be instantiated", () => {
    const input = new ResendOtpInput();

    expect(input).toBeInstanceOf(ResendOtpInput);
  });

  it("should have identifier property", () => {
    const input = new ResendOtpInput();
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

      return storage.metadataByTargetCollection.get(ResendOtpInput).fields.all;
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
