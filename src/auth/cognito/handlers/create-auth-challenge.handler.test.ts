/**
 * @file create-auth-challenge.handler.test.ts
 * @description Unit tests for the Cognito CreateAuthChallenge trigger handler
 * @module auth/cognito/handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateAuthChallengeTriggerEvent } from "aws-lambda";

import {
  createCreateAuthChallengeHandler,
  createAuthChallenge,
} from "./create-auth-challenge.handler";
import type { OtpDeliveryPort } from "../delivery/otp-delivery.port";
import {
  createCreateAuthChallengeEvent,
  mockLambdaContext,
  noopCallback,
} from "./cognito-events.fixture";

/** Phone number reused across retry scenarios. */
const PHONE = "+1234567890";

/** Previously-issued challenge metadata reused across retry scenarios. */
const CODE_META = "CODE-123456";

/** Delivery spy shared across tests. */
// eslint-disable-next-line functional/no-let -- reassigned per test in beforeEach
let delivery: { deliver: ReturnType<typeof vi.fn> } & OtpDeliveryPort;

beforeEach(() => {
  delivery = { deliver: vi.fn().mockResolvedValue(undefined) };
});

// eslint-disable-next-line max-lines-per-function -- exhaustive OTP scenarios
describe("createAuthChallenge", () => {
  describe("OTP generation", () => {
    it("generates a fresh 6-digit code on the first attempt", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent();

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(
        result?.response.privateChallengeParameters.secretLoginCode
      ).toMatch(/^\d{6}$/);
      expect(result?.response.challengeMetadata).toMatch(/^CODE-\d{6}$/);
    });

    it("reuses the previous code on retries", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { phone_number: PHONE },
          challengeName: "CUSTOM_CHALLENGE",
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: CODE_META,
            },
          ],
        },
      });

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(result?.response.privateChallengeParameters.secretLoginCode).toBe(
        "123456"
      );
      expect(result?.response.challengeMetadata).toBe(CODE_META);
    });

    it("generates a fresh code when the retry metadata is unparseable", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { phone_number: PHONE },
          challengeName: "CUSTOM_CHALLENGE",
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: "no-code-here",
            },
          ],
        },
      });

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(
        result?.response.privateChallengeParameters.secretLoginCode
      ).toMatch(/^\d{6}$/);
    });
  });

  describe("delivery", () => {
    it("delivers the code to the destination on the first attempt", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { phone_number: "+18003334444" },
          challengeName: "CUSTOM_CHALLENGE",
          session: [],
        },
      });

      await handler(event, mockLambdaContext, noopCallback);

      expect(delivery.deliver).toHaveBeenCalledWith(
        "+18003334444",
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it("prefers phone number then email as the destination", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { email: "user@example.com" },
          challengeName: "CUSTOM_CHALLENGE",
          session: [],
        },
      });

      await handler(event, mockLambdaContext, noopCallback);

      expect(delivery.deliver).toHaveBeenCalledWith(
        "user@example.com",
        expect.any(String)
      );
    });

    it("does not deliver on retry attempts", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { phone_number: PHONE },
          challengeName: "CUSTOM_CHALLENGE",
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: CODE_META,
            },
          ],
        },
      });

      await handler(event, mockLambdaContext, noopCallback);

      expect(delivery.deliver).not.toHaveBeenCalled();
    });
  });

  describe("attempt tracking", () => {
    it("exposes attempt counts in publicChallengeParameters", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent({
        request: {
          userAttributes: { phone_number: PHONE },
          challengeName: "CUSTOM_CHALLENGE",
          session: [
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: CODE_META,
            },
            {
              challengeName: "CUSTOM_CHALLENGE",
              challengeResult: false,
              challengeMetadata: CODE_META,
            },
          ],
        },
      });

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(result?.response.publicChallengeParameters).toEqual(
        expect.objectContaining({
          attempts: "2",
          attemptsLeft: "1",
          maxAttempts: "3",
          destination: PHONE,
        })
      );
    });

    it("reports zero attempts on the first attempt", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const event = createCreateAuthChallengeEvent();

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(result?.response.publicChallengeParameters).toEqual(
        expect.objectContaining({
          attempts: "0",
          attemptsLeft: "3",
          maxAttempts: "3",
        })
      );
    });
  });

  describe("edge cases", () => {
    it("returns the event unchanged when userAttributes are missing", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const base = createCreateAuthChallengeEvent();
      const event = {
        ...base,
        request: { ...base.request, userAttributes: undefined },
      } as unknown as CreateAuthChallengeTriggerEvent;

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(result).toEqual(event);
      expect(delivery.deliver).not.toHaveBeenCalled();
    });

    it("handles an undefined session as a first attempt", async () => {
      const handler = createCreateAuthChallengeHandler(delivery);
      const base = createCreateAuthChallengeEvent();
      const event = {
        ...base,
        request: { ...base.request, session: undefined },
      } as unknown as CreateAuthChallengeTriggerEvent;

      const result = await handler(event, mockLambdaContext, noopCallback);

      expect(
        result?.response.privateChallengeParameters.secretLoginCode
      ).toMatch(/^\d{6}$/);
      expect(delivery.deliver).toHaveBeenCalledTimes(1);
    });
  });

  describe("default entrypoint", () => {
    it("is bound to the offline-safe console adapter", async () => {
      const event = createCreateAuthChallengeEvent();

      const result = await createAuthChallenge(
        event,
        mockLambdaContext,
        noopCallback
      );

      expect(
        result?.response.privateChallengeParameters.secretLoginCode
      ).toMatch(/^\d{6}$/);
    });
  });
});
