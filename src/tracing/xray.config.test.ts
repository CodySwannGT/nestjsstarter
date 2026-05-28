/**
 * @file xray.config.test.ts
 * @description Unit tests for X-Ray configuration module with graceful degradation.
 * Avoids vi.resetModules() because each dynamic re-import loads the full dependency
 * graph (graphql transforms, SDK deps) causing OOM in fork workers.
 * Tests are ordered to work with the module's internal initState.
 * @module tracing
 */

import { vi, expect, beforeEach, afterAll, describe, it } from "vitest";

const { mockLog, mockWarn } = vi.hoisted(() => ({
  mockLog: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock("@nestjs/common", () => ({
  Logger: vi.fn().mockImplementation(function () {
    return {
      debug: vi.fn(),
      log: mockLog,
      warn: mockWarn,
      error: vi.fn(),
    };
  }),
}));

/**
 * Mock aws-xray-sdk-core to prevent global Promise patching via capturePromise()
 * and to avoid OOM from loading the full SDK dependency tree in each worker.
 */
vi.mock("aws-xray-sdk-core", () => ({
  setContextMissingStrategy: vi.fn(),
  captureHTTPsGlobal: vi.fn(),
  capturePromise: vi.fn(),
  setStreamingThreshold: vi.fn(),
  getSegment: vi.fn(() => undefined),
  getNamespace: vi.fn(() => ({ name: "AWSXRay" })),
}));

// Store original env for restoration
const originalEnv = { ...process.env };

describe("xray.config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getXRaySegment", () => {
    it("should return null when getSegment returns undefined", async () => {
      const { getXRaySegment } = await import("./xray.config");

      const segment = getXRaySegment();

      expect(segment).toBeNull();
    });
  });

  describe("getXRayNamespace", () => {
    it("should return namespace when X-Ray SDK is available", async () => {
      const { getXRayNamespace } = await import("./xray.config");

      const namespace = getXRayNamespace();

      expect(namespace).not.toBeNull();
      expect(namespace).toHaveProperty("name", "AWSXRay");
    });
  });

  describe("initializeXRay", () => {
    it("should not throw when called", async () => {
      const { initializeXRay } = await import("./xray.config");

      expect(() => initializeXRay()).not.toThrow();
    });
  });

  describe("graceful degradation", () => {
    it("should not throw when all functions called together", async () => {
      const { initializeXRay, getXRaySegment, getXRayNamespace } =
        await import("./xray.config");

      expect(() => {
        initializeXRay();
        getXRaySegment();
        getXRayNamespace();
      }).not.toThrow();
    });
  });
});
