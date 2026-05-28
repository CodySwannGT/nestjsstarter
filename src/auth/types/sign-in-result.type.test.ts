/**
 * @file sign-in-result.type.test.ts
 * @description Unit tests for SignInResult GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { ChallengeParametersResult } from "./challenge-parameters-result.type";
import { ChallengeResult } from "./challenge-result.type";
import { SignInResult } from "./sign-in-result.type";

describe("SignInResult", () => {
  it("should be a class that can be instantiated", () => {
    const result = new SignInResult();

    expect(result).toBeInstanceOf(SignInResult);
  });

  it("should have message property", () => {
    const result = new SignInResult();
    result.message = "OTP sent successfully";

    expect(result.message).toBe("OTP sent successfully");
  });

  it("should have data property as ChallengeResult", () => {
    const result = new SignInResult();
    const challengeResult = new ChallengeResult();
    challengeResult.ChallengeName = "CUSTOM_CHALLENGE";
    challengeResult.Session = "session-123";

    const params = new ChallengeParametersResult();
    params.USERNAME = "testuser";
    challengeResult.ChallengeParameters = params;

    result.data = challengeResult;

    expect(result.data).toBe(challengeResult);
    expect(result.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
    expect(result.data.Session).toBe("session-123");
    expect(result.data.ChallengeParameters?.USERNAME).toBe("testuser");
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

      return storage.metadataByTargetCollection.get(SignInResult).fields.all;
    };

    it("should register message field with String type", () => {
      const field = getFields().find(f => f.name === "message");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(String);
    });

    it("should register data field with ChallengeResult type", () => {
      const field = getFields().find(f => f.name === "data");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(ChallengeResult);
    });

    it("should register both fields as non-nullable", () => {
      const messageField = getFields().find(f => f.name === "message");
      const dataField = getFields().find(f => f.name === "data");

      expect(messageField?.options?.nullable).toBeUndefined();
      expect(dataField?.options?.nullable).toBeUndefined();
    });
  });
});
