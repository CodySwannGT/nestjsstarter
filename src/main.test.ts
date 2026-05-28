/**
 * @file main.test.ts
 * @description Unit tests for Lambda handler exports
 * @module main
 */

import { vi, expect } from "vitest";

vi.mock("./tracing", () => ({
  initializeXRay: vi.fn(),
  getXRaySegment: vi.fn(),
  getXRayNamespace: vi.fn(),
  withXRaySubsegment: vi.fn((_name: string, fn: (sub: unknown) => unknown) =>
    fn(undefined)
  ),
}));

const { handler } = await import("./main");

describe("Lambda handler", () => {
  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  it("should be a function", () => {
    expect(typeof handler).toBe("function");
  });

  it("should accept three parameters", () => {
    // Verify the handler function signature has 3 parameters (event, context, callback)
    expect(handler.length).toBe(3);
  });
});
