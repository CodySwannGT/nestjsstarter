/**
 * @file verify-auth-challenge-response.handler.test.ts
 * @description Unit tests for the Cognito VerifyAuthChallengeResponse trigger
 * @module auth/cognito/handlers
 */

import { describe, it, expect } from "vitest";
import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";

import { verifyAuthChallengeResponse } from "./verify-auth-challenge-response.handler";
import {
  createVerifyAuthChallengeResponseEvent,
  mockLambdaContext,
  noopCallback,
} from "./cognito-events.fixture";

/**
 * Invokes the handler with a mutated `challengeAnswer` value.
 * @param answer - The raw challenge answer to assign (may be null/undefined)
 * @returns The handler result
 */
async function runWithAnswer(
  answer: unknown
): Promise<VerifyAuthChallengeResponseTriggerEvent> {
  const event = createVerifyAuthChallengeResponseEvent();
  Object.defineProperty(event.request, "challengeAnswer", {
    value: answer,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return verifyAuthChallengeResponse(event, mockLambdaContext, noopCallback);
}

// eslint-disable-next-line max-lines-per-function -- exhaustive comparison matrix
describe("verifyAuthChallengeResponse", () => {
  it("accepts a matching code", async () => {
    const event = createVerifyAuthChallengeResponseEvent({
      request: {
        privateChallengeParameters: { secretLoginCode: "123456" },
        challengeAnswer: "123456",
      },
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(true);
  });

  it("rejects a mismatched code", async () => {
    const event = createVerifyAuthChallengeResponseEvent({
      request: {
        privateChallengeParameters: { secretLoginCode: "123456" },
        challengeAnswer: "654321",
      },
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(false);
  });

  it("rejects an empty answer", async () => {
    const result = await runWithAnswer("");
    expect(result.response.answerCorrect).toBe(false);
  });

  it("rejects a null answer", async () => {
    const result = await runWithAnswer(null);
    expect(result.response.answerCorrect).toBe(false);
  });

  it("performs a case-sensitive comparison", async () => {
    const event = createVerifyAuthChallengeResponseEvent({
      request: {
        privateChallengeParameters: { secretLoginCode: "ABC123" },
        challengeAnswer: "abc123",
      },
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(false);
  });

  it("does not trim whitespace", async () => {
    const event = createVerifyAuthChallengeResponseEvent({
      request: {
        privateChallengeParameters: { secretLoginCode: "123456" },
        challengeAnswer: " 123456 ",
      },
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(false);
  });

  it("treats both-undefined as matching", async () => {
    const event = createVerifyAuthChallengeResponseEvent();
    Object.defineProperty(
      event.request.privateChallengeParameters,
      "secretLoginCode",
      { value: undefined, writable: true, enumerable: true, configurable: true }
    );
    Object.defineProperty(event.request, "challengeAnswer", {
      value: undefined,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(true);
  });

  it("handles a missing request object", async () => {
    const base = createVerifyAuthChallengeResponseEvent();
    const event = {
      ...base,
      request: undefined,
    } as unknown as VerifyAuthChallengeResponseTriggerEvent;

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(true);
  });

  it("preserves other event properties", async () => {
    const event = createVerifyAuthChallengeResponseEvent({
      request: {
        userAttributes: { email: "test@example.com" },
        privateChallengeParameters: { secretLoginCode: "123456" },
        challengeAnswer: "123456",
      },
    });

    const result = await verifyAuthChallengeResponse(
      event,
      mockLambdaContext,
      noopCallback
    );

    expect(result.response.answerCorrect).toBe(true);
    expect(result.request).toEqual(event.request);
  });
});
