/**
 * @file challenge-parameters-result.type.test.ts
 * @description Unit tests for ChallengeParametersResult GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { ChallengeParametersResult } from "./challenge-parameters-result.type";

describe("ChallengeParametersResult", () => {
  it("should be a class that can be instantiated", () => {
    const result = new ChallengeParametersResult();

    expect(result).toBeInstanceOf(ChallengeParametersResult);
  });

  it("should have USERNAME property", () => {
    const result = new ChallengeParametersResult();
    result.USERNAME = "testuser";

    expect(result.USERNAME).toBe("testuser");
  });

  it("should have attempts property", () => {
    const result = new ChallengeParametersResult();
    result.attempts = "2";

    expect(result.attempts).toBe("2");
  });

  it("should have attemptsLeft property", () => {
    const result = new ChallengeParametersResult();
    result.attemptsLeft = "3";

    expect(result.attemptsLeft).toBe("3");
  });

  it("should have email property", () => {
    const result = new ChallengeParametersResult();
    result.email = "test@example.com";

    expect(result.email).toBe("test@example.com");
  });

  it("should have maxAttempts property", () => {
    const result = new ChallengeParametersResult();
    result.maxAttempts = "5";

    expect(result.maxAttempts).toBe("5");
  });

  it("should allow all properties to be undefined when nullable", () => {
    const result = new ChallengeParametersResult();

    expect(result.USERNAME).toBeUndefined();
    expect(result.attempts).toBeUndefined();
    expect(result.attemptsLeft).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.maxAttempts).toBeUndefined();
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

      return storage.metadataByTargetCollection.get(ChallengeParametersResult)
        .fields.all;
    };

    it("should register USERNAME field with String type", () => {
      const field = getFields().find(f => f.name === "USERNAME");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register attempts field with String type", () => {
      const field = getFields().find(f => f.name === "attempts");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register attemptsLeft field with String type", () => {
      const field = getFields().find(f => f.name === "attemptsLeft");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register email field with String type", () => {
      const field = getFields().find(f => f.name === "email");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register maxAttempts field with String type", () => {
      const field = getFields().find(f => f.name === "maxAttempts");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });
  });
});
