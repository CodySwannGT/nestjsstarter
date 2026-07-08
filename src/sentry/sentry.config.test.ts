/**
 * @file sentry.config.test.ts
 * @description Unit tests for Sentry initialization, proving it is inert when
 * SENTRY_DSN is unset and correctly configured when a DSN is present.
 * @module sentry
 */

import { vi, expect, beforeEach, afterAll, describe, it } from "vitest";

const { mockInit, mockProfilingIntegration, mockLog } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockProfilingIntegration: vi.fn(() => ({ name: "ProfilingIntegration" })),
  mockLog: vi.fn(),
}));

vi.mock("@sentry/nestjs", () => ({
  init: mockInit,
}));

vi.mock("@sentry/profiling-node", () => ({
  nodeProfilingIntegration: mockProfilingIntegration,
}));

vi.mock("@nestjs/common", () => ({
  Logger: vi.fn().mockImplementation(function () {
    return {
      debug: vi.fn(),
      log: mockLog,
      warn: vi.fn(),
      error: vi.fn(),
    };
  }),
}));

const originalEnv = { ...process.env };

/** Placeholder DSN used across the enabled-path cases. */
const TEST_DSN = "https://public@sentry.example/1";

/**
 * Re-imports the module fresh so the internal one-shot `initState` guard is
 * reset between cases. The mocked dependency graph is tiny, so resetModules is
 * cheap here (unlike the X-Ray suite which loads the full SDK).
 * @returns The freshly imported `initializeSentry` function.
 */
async function freshInitializeSentry(): Promise<() => void> {
  vi.resetModules();
  return (await import("./sentry.config")).initializeSentry;
}

describe("sentry.config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.STAGE;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_PROFILES_SAMPLE_RATE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("initializes disabled with no DSN and no profiling integration", async () => {
    const initializeSentry = await freshInitializeSentry();

    expect(() => initializeSentry()).not.toThrow();
    expect(mockInit).toHaveBeenCalledTimes(1);

    const options = mockInit.mock.calls[0]![0] as Record<string, unknown>;
    expect(options.dsn).toBe("");
    expect(options.enabled).toBe(false);
    expect(options.integrations).toEqual([]);
    expect(mockProfilingIntegration).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith("Sentry disabled (no SENTRY_DSN)");
  });

  it("defaults environment and sample rates to offline-safe values", async () => {
    const initializeSentry = await freshInitializeSentry();
    initializeSentry();

    const options = mockInit.mock.calls[0]![0] as Record<string, unknown>;
    expect(options.environment).toBe("development");
    expect(options.tracesSampleRate).toBe(0);
    expect(options.profilesSampleRate).toBe(0);
  });

  it("initializes enabled with a DSN and attaches profiling", async () => {
    process.env.SENTRY_DSN = TEST_DSN;
    process.env.SENTRY_ENVIRONMENT = "staging";
    process.env.SENTRY_TRACES_SAMPLE_RATE = "0.25";
    process.env.SENTRY_PROFILES_SAMPLE_RATE = "0.5";

    const initializeSentry = await freshInitializeSentry();
    initializeSentry();

    const options = mockInit.mock.calls[0]![0] as Record<string, unknown>;
    expect(options.dsn).toBe(TEST_DSN);
    expect(options.enabled).toBe(true);
    expect(options.environment).toBe("staging");
    expect(options.tracesSampleRate).toBe(0.25);
    expect(options.profilesSampleRate).toBe(0.5);
    expect(mockProfilingIntegration).toHaveBeenCalledTimes(1);
    expect(options.integrations).toEqual([{ name: "ProfilingIntegration" }]);
    expect(mockLog).toHaveBeenCalledWith("Sentry initialized");
  });

  it("falls back to STAGE for environment when SENTRY_ENVIRONMENT is unset", async () => {
    process.env.SENTRY_DSN = TEST_DSN;
    process.env.STAGE = "production";

    const initializeSentry = await freshInitializeSentry();
    initializeSentry();

    const options = mockInit.mock.calls[0]![0] as Record<string, unknown>;
    expect(options.environment).toBe("production");
  });

  it("coerces a non-numeric sample rate to 0", async () => {
    process.env.SENTRY_DSN = TEST_DSN;
    process.env.SENTRY_TRACES_SAMPLE_RATE = "not-a-number";

    const initializeSentry = await freshInitializeSentry();
    initializeSentry();

    const options = mockInit.mock.calls[0]![0] as Record<string, unknown>;
    expect(options.tracesSampleRate).toBe(0);
  });

  it("is idempotent: a second call does not re-initialize", async () => {
    const initializeSentry = await freshInitializeSentry();

    initializeSentry();
    initializeSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
