/**
 * @file pre-sign-up.handler.test.ts
 * @description Unit tests for the Cognito PreSignUp trigger handler
 * @module auth/cognito/handlers
 */

import { describe, it, expect } from "vitest";
import type { PreSignUpTriggerEvent } from "aws-lambda";

import { preSignUp } from "./pre-sign-up.handler";
import {
  createPreSignUpEvent,
  mockLambdaContext,
  noopCallback,
} from "./cognito-events.fixture";

/** Phone number reused across scenarios. */
const PHONE = "+1234567890";

describe("preSignUp", () => {
  it("auto-confirms and auto-verifies present contact attributes", async () => {
    const event = createPreSignUpEvent({
      request: {
        userAttributes: {
          phone_number: PHONE,
          email: "test@example.com",
        },
      },
    });

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
    expect(result.response.autoVerifyPhone).toBe(true);
    expect(result.response.autoVerifyEmail).toBe(true);
  });

  it("only verifies phone when only a phone number is present", async () => {
    const event = createPreSignUpEvent({
      request: { userAttributes: { phone_number: PHONE } },
    });

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
    expect(result.response.autoVerifyPhone).toBe(true);
    // Absent email attribute → handler leaves the pre-existing flag untouched.
    expect(result.response.autoVerifyEmail).toBe(false);
  });

  it("only verifies email when only an email is present", async () => {
    const event = createPreSignUpEvent({
      request: { userAttributes: { email: "test@example.com" } },
    });

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
    expect(result.response.autoVerifyEmail).toBe(true);
    // Absent phone attribute → handler leaves the pre-existing flag untouched.
    expect(result.response.autoVerifyPhone).toBe(false);
  });

  it("preserves request properties", async () => {
    const event = createPreSignUpEvent({
      request: {
        userAttributes: { phone_number: PHONE, name: "Test User" },
        validationData: { referralCode: "REF123" },
        clientMetadata: { appVersion: "1.0.0" },
      },
    });

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.request).toEqual(event.request);
  });

  it("still auto-confirms with empty user attributes", async () => {
    const event = createPreSignUpEvent({ request: { userAttributes: {} } });

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
    // No contact attributes present → verify flags keep their prior values.
    expect(result.response.autoVerifyPhone).toBe(false);
    expect(result.response.autoVerifyEmail).toBe(false);
  });

  it("creates a response even when one is missing", async () => {
    const base = createPreSignUpEvent();
    const event = {
      ...base,
      response: undefined,
    } as unknown as PreSignUpTriggerEvent;

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
  });

  it("still auto-confirms when the request is missing", async () => {
    const base = createPreSignUpEvent();
    const event = {
      ...base,
      request: undefined,
    } as unknown as PreSignUpTriggerEvent;

    const result = await preSignUp(event, mockLambdaContext, noopCallback);

    expect(result.response.autoConfirmUser).toBe(true);
  });
});
