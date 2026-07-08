/**
 * @file pre-token-generation.handler.test.ts
 * @description Unit tests for the Cognito PreTokenGeneration pass-through trigger
 * @module auth/cognito/handlers
 */

import { describe, it, expect, vi } from "vitest";
import type { Logger } from "@nestjs/common";
import type { PreTokenGenerationTriggerEvent } from "aws-lambda";

import { createPreTokenGenerationHandler } from "./pre-token-generation.handler";
import {
  createPreTokenGenerationEvent,
  mockLambdaContext,
  noopCallback,
} from "./cognito-events.fixture";

/** Username reused across scenarios. */
const USER = "cognito-user";

/**
 * Builds a mock logger exposing the methods the handler uses.
 * @returns A logger stub with spy methods
 */
const buildLogger = (): Logger =>
  ({ debug: vi.fn(), log: vi.fn(), error: vi.fn() }) as unknown as Logger;

describe("preTokenGeneration (pass-through)", () => {
  it("returns the event unchanged without adding app-specific claims", async () => {
    const logger = buildLogger();
    const handler = createPreTokenGenerationHandler(logger);
    const event = createPreTokenGenerationEvent({ userName: USER });

    const result = await handler(event, mockLambdaContext, noopCallback);

    expect(result).toEqual(event);
    expect(
      result?.response.claimsOverrideDetails?.claimsToAddOrOverride
    ).toEqual({});
  });

  it("preserves pre-existing claims untouched", async () => {
    const logger = buildLogger();
    const handler = createPreTokenGenerationHandler(logger);
    const event = createPreTokenGenerationEvent({
      userName: USER,
      response: {
        claimsOverrideDetails: {
          claimsToAddOrOverride: { existingClaim: "value" },
          claimsToSuppress: [],
        },
      },
    });

    const result = await handler(event, mockLambdaContext, noopCallback);

    expect(
      result?.response.claimsOverrideDetails?.claimsToAddOrOverride
    ).toEqual({ existingClaim: "value" });
  });

  it("logs a debug line for real invocations", async () => {
    const logger = buildLogger();
    const handler = createPreTokenGenerationHandler(logger);
    const event = createPreTokenGenerationEvent({ userName: USER });

    await handler(event, mockLambdaContext, noopCallback);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(USER));
  });

  it("returns warmup calls (no user attributes) unchanged and unlogged", async () => {
    const logger = buildLogger();
    const handler = createPreTokenGenerationHandler(logger);
    const event = {
      userName: "warmup",
      request: {},
      response: {},
      triggerSource: "TokenGeneration_Authentication",
    } as unknown as PreTokenGenerationTriggerEvent;

    const result = await handler(event, mockLambdaContext, noopCallback);

    expect(result).toBe(event);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("works with the default logger", async () => {
    const handler = createPreTokenGenerationHandler();
    const event = createPreTokenGenerationEvent({ userName: USER });

    const result = await handler(event, mockLambdaContext, noopCallback);

    expect(result).toEqual(event);
  });
});
