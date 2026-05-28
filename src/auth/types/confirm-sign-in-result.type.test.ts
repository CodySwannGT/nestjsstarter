/**
 * @file confirm-sign-in-result.type.test.ts
 * @description Unit tests for ConfirmSignInResult GraphQL type
 * @module auth/types
 */
import { expect } from "vitest";
import "reflect-metadata";
import { LazyMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage";
import { TypeMetadataStorage } from "@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage";

import { AuthenticationResult } from "./authentication-result.type";
import { AuthenticationResultWithMessage } from "./authentication-result-with-message.type";
import { ChallengeResult } from "./challenge-result.type";
import { ConfirmSignInResult } from "./confirm-sign-in-result.type";
import { Message } from "./message.type";
import { SignInResult } from "./sign-in-result.type";

describe("ConfirmSignInResult", () => {
  it("should be a class that can be instantiated", () => {
    const result = new ConfirmSignInResult();

    expect(result).toBeInstanceOf(ConfirmSignInResult);
  });

  it("should have errorMessage field with Message type", () => {
    const result = new ConfirmSignInResult();
    const message = new Message();
    message.message = "Invalid OTP code";

    result.errorMessage = message;

    expect(result.errorMessage).toBe(message);
    expect(result.errorMessage.message).toBe("Invalid OTP code");
  });

  it("should have authResult field with AuthenticationResultWithMessage type", () => {
    const result = new ConfirmSignInResult();
    const authResultWithMessage = new AuthenticationResultWithMessage();
    const authResult = new AuthenticationResult();
    authResult.accessToken = "test-token";
    authResultWithMessage.data = authResult;
    authResultWithMessage.message = "Sign-in successful";

    result.authResult = authResultWithMessage;

    expect(result.authResult).toBe(authResultWithMessage);
    expect(result.authResult.message).toBe("Sign-in successful");
    expect(result.authResult.data?.accessToken).toBe("test-token");
  });

  it("should have signInResult field with SignInResult type", () => {
    const result = new ConfirmSignInResult();
    const signInResult = new SignInResult();
    const challengeResult = new ChallengeResult();
    challengeResult.ChallengeName = "CUSTOM_CHALLENGE";
    signInResult.message = "Additional verification required";
    signInResult.data = challengeResult;

    result.signInResult = signInResult;

    expect(result.signInResult).toBe(signInResult);
    expect(result.signInResult.message).toBe(
      "Additional verification required"
    );
    expect(result.signInResult.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
  });

  it("should have all fields as nullable", () => {
    const result = new ConfirmSignInResult();

    expect(result.errorMessage).toBeUndefined();
    expect(result.authResult).toBeUndefined();
    expect(result.signInResult).toBeUndefined();
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

      return storage.metadataByTargetCollection.get(ConfirmSignInResult).fields
        .all;
    };

    it("should register errorMessage field with Message type", () => {
      const field = getFields().find(f => f.name === "errorMessage");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(Message);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register authResult field with AuthenticationResultWithMessage type", () => {
      const field = getFields().find(f => f.name === "authResult");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(AuthenticationResultWithMessage);
      expect(field?.options?.nullable).toBe(true);
    });

    it("should register signInResult field with SignInResult type", () => {
      const field = getFields().find(f => f.name === "signInResult");

      expect(field).toBeDefined();
      expect(field?.typeFn()).toBe(SignInResult);
      expect(field?.options?.nullable).toBe(true);
    });
  });
});
