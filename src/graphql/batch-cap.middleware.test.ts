/**
 * @file batch-cap.middleware.test.ts
 * @description Unit tests for the batched-POST operation-cap middleware
 * @module graphql
 */

import { vi, expect } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createBatchCapMiddleware } from "./batch-cap.middleware";

/**
 * Test harness bundle: stubbed Express objects plus their spies.
 */
interface Harness {
  readonly req: Request;
  readonly res: Response;
  readonly next: NextFunction;
  readonly status: ReturnType<typeof vi.fn>;
  readonly json: ReturnType<typeof vi.fn>;
  readonly setHeader: ReturnType<typeof vi.fn>;
}

/**
 * Build a minimal Express req/res/next triple with spies, so the factory's
 * branch logic can be exercised without booting Nest or Apollo.
 * @param body - The value to expose as `req.body`.
 * @returns The stubbed req/res/next and their spies.
 */
const harness = (body: unknown): Harness => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }) as unknown as Response);
  const setHeader = vi.fn();
  const res = { status, json, setHeader } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  const req = { body } as Request;
  return { req, res, next, status, json, setHeader };
};

const TOO_LARGE_BODY = {
  errors: [
    {
      message:
        "Batched request exceeds the maximum of 10 operations per request.",
      extensions: { code: "BATCH_TOO_LARGE" },
    },
  ],
};

describe("createBatchCapMiddleware", () => {
  const middleware = createBatchCapMiddleware(10);

  it("M1: rejects an over-cap array with the exact non-leaky 400 body and does not call next", () => {
    const { req, res, next, status, json, setHeader } = harness(
      Array.from({ length: 11 }, () => ({ query: "{ ping }" }))
    );

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(TOO_LARGE_BODY);
    expect(json.mock.calls[0][0]).not.toHaveProperty("data");
    expect(setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
    expect(next).not.toHaveBeenCalled();
  });

  it("M2: passes an at-cap array through untouched", () => {
    const { req, res, next, status, json } = harness(
      Array.from({ length: 10 }, () => ({ query: "{ ping }" }))
    );

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("M3: passes a within-cap single-element array through", () => {
    const { req, res, next } = harness([{ query: "{ ping }" }]);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("M4: passes a non-array (single operation) body through untouched", () => {
    const { req, res, next, status } = harness({ query: "{ ping }" });

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it("M5: passes an undefined body (GET/landing-page path) through", () => {
    const { req, res, next } = harness(undefined);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
