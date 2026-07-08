/**
 * @file define-auth-challenge.handler.test.ts
 * @description Unit tests for the Cognito DefineAuthChallenge trigger handler
 * @module auth/cognito/handlers
 */

import { describe, it, expect } from "vitest";
import type { DefineAuthChallengeTriggerEvent } from "aws-lambda";

import { defineAuthChallenge } from "./define-auth-challenge.handler";
import {
  createDefineAuthChallengeEvent,
  createMockSession,
  mockLambdaContext,
  noopCallback,
} from "./cognito-events.fixture";

// eslint-disable-next-line max-lines-per-function -- exhaustive table of trigger scenarios
describe("defineAuthChallenge", () => {
  describe("successful authentication", () => {
    it("issues tokens when the challenge is answered correctly", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: true,
              challengeMetadata: "CODE-123456",
            },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(true);
      expect(result?.response.failAuthentication).toBe(false);
    });

    it("succeeds after earlier failures within the limit", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: "CODE-1",
            },
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: true,
              challengeMetadata: "CODE-2",
            },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(true);
      expect(result?.response.failAuthentication).toBe(false);
    });

    it("allows success on exactly the maximum attempt", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: "CODE-1",
            },
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: "CODE-2",
            },
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: true,
              challengeMetadata: "CODE-3",
            },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(true);
      expect(result?.response.failAuthentication).toBe(false);
    });
  });

  describe("failed authentication", () => {
    it("fails after the maximum failed attempts", async () => {
      const event = createDefineAuthChallengeEvent({
        request: { session: createMockSession(3, 3) },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(false);
      expect(result?.response.failAuthentication).toBe(true);
    });

    it("fails immediately for a non-custom challenge", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            { challengeName: "PASSWORD_VERIFIER", challengeResult: true },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(false);
      expect(result?.response.failAuthentication).toBe(true);
    });

    it("fails on mixed challenge types", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: true,
              challengeMetadata: "CODE-1",
            },
            { challengeName: "SMS_MFA", challengeResult: false },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(false);
      expect(result?.response.failAuthentication).toBe(true);
    });
  });

  describe("challenge continuation", () => {
    it("continues on a wrong answer within the limit", async () => {
      const event = createDefineAuthChallengeEvent({
        request: {
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: "CODE-1",
            },
          ],
        },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(false);
      expect(result?.response.failAuthentication).toBe(false);
      expect(result?.response.challengeName).toBe("CUSTOM_CHALLENGE");
    });

    it("initiates a challenge for an empty session", async () => {
      const event = createDefineAuthChallengeEvent({
        request: { session: [] },
      });

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result?.response.issueTokens).toBe(false);
      expect(result?.response.failAuthentication).toBe(false);
      expect(result?.response.challengeName).toBe("CUSTOM_CHALLENGE");
    });
  });

  describe("edge cases", () => {
    it("returns the event unchanged when session is missing", async () => {
      const base = createDefineAuthChallengeEvent();
      const event = {
        ...base,
        request: { ...base.request, session: undefined },
      } as unknown as DefineAuthChallengeTriggerEvent;

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result).toEqual(event);
    });

    it("returns the event unchanged when request is missing", async () => {
      const base = createDefineAuthChallengeEvent();
      const event = {
        ...base,
        request: null,
      } as unknown as DefineAuthChallengeTriggerEvent;

      const result = await defineAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(result).toEqual(event);
    });
  });
});
