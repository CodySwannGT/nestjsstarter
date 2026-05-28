/**
 * @file challenge-result.type.test.ts
 * @description Unit tests for ChallengeResult GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { ChallengeParametersResult } from "./challenge-parameters-result.type";
import { ChallengeResult } from "./challenge-result.type";

describe("ChallengeResult", () => {
  it("should be a class that can be instantiated", () => {
    const result = new ChallengeResult();

    expect(result).toBeInstanceOf(ChallengeResult);
  });

  it("should have ChallengeName property", () => {
    const result = new ChallengeResult();
    result.ChallengeName = "CUSTOM_CHALLENGE";

    expect(result.ChallengeName).toBe("CUSTOM_CHALLENGE");
  });

  it("should have Session property", () => {
    const result = new ChallengeResult();
    result.Session = "session-token-123";

    expect(result.Session).toBe("session-token-123");
  });

  it("should have ChallengeParameters property", () => {
    const result = new ChallengeResult();
    const params = new ChallengeParametersResult();
    params.USERNAME = "testuser";
    params.email = "test@example.com";
    result.ChallengeParameters = params;

    expect(result.ChallengeParameters).toBe(params);
    expect(result.ChallengeParameters.USERNAME).toBe("testuser");
    expect(result.ChallengeParameters.email).toBe("test@example.com");
  });

  it("should allow all properties to be undefined when nullable", () => {
    const result = new ChallengeResult();

    expect(result.ChallengeName).toBeUndefined();
    expect(result.Session).toBeUndefined();
    expect(result.ChallengeParameters).toBeUndefined();
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

      return storage.metadataByTargetCollection.get(ChallengeResult).fields.all;
    };

    it("should register ChallengeName field with String type", () => {
      const field = getFields().find(f => f.name === "ChallengeName");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register Session field with String type", () => {
      const field = getFields().find(f => f.name === "Session");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register ChallengeParameters field with ChallengeParametersResult type", () => {
      const field = getFields().find(f => f.name === "ChallengeParameters");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(ChallengeParametersResult);
      expect(field?.options?.nullable).toBe(true);
    });
  });
});
