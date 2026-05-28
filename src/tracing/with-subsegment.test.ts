/**
 * @file with-subsegment.test.ts
 * @description Unit tests for X-Ray subsegment utility with graceful degradation
 * and full X-Ray-available tracing paths
 * @module tracing
 */

/* eslint-disable max-lines -- comprehensive test coverage requires extensive test cases */

import { vi, expect, type Mock } from "vitest";

const { mockLog, mockWarn, mockDebug, mockError } = vi.hoisted(() => ({
  mockLog: vi.fn(),
  mockWarn: vi.fn(),
  mockDebug: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("@nestjs/common", () => ({
  Logger: vi.fn().mockImplementation(function () {
    return {
      debug: mockDebug,
      log: mockLog,
      warn: mockWarn,
      error: mockError,
    };
  }),
}));

/**
 * Module path for xray config mock.
 */
const XRAY_CONFIG_MODULE = "./xray.config";

/**
 * Test operation name to avoid duplicate strings.
 */
const TEST_OPERATION_NAME = "test-operation";

/**
 * Non-Error throw value to avoid sonarjs/no-duplicate-string.
 */
const NON_ERROR_THROW_VALUE = "string-error";

/**
 * Creates a promise that resolves after the specified delay.
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Helper function to get the withXRaySubsegment function via dynamic import
 * after vi.resetModules() for proper test isolation.
 * @returns The withXRaySubsegment function from the module
 */
async function getWithXRaySubsegment(): Promise<
  typeof import("./with-subsegment").withXRaySubsegment
> {
  const mod = await import("./with-subsegment");
  return mod.withXRaySubsegment;
}

/**
 * Creates a mock X-Ray subsegment with all expected methods.
 * @returns Mock subsegment object with vi.fn() implementations
 */
function createMockSubsegment(): {
  addAnnotation: Mock;
  addMetadata: Mock;
  addError: Mock;
  isClosed: Mock;
  close: Mock;
} {
  return {
    addAnnotation: vi.fn(),
    addMetadata: vi.fn(),
    addError: vi.fn(),
    isClosed: vi.fn().mockReturnValue(false),
    close: vi.fn(),
  };
}

/**
 * Creates a mock X-Ray segment that returns the given subsegment.
 * @param subsegment - The mock subsegment to return from addNewSubsegment
 * @returns Mock segment object
 */
function createMockSegment(
  subsegment: ReturnType<typeof createMockSubsegment>
): { addNewSubsegment: Mock } {
  return {
    addNewSubsegment: vi.fn().mockReturnValue(subsegment),
  };
}

/**
 * Creates a mock X-Ray namespace that executes functions synchronously.
 * @returns Mock namespace object
 */
function createMockNamespace(): { runAndReturn: Mock } {
  return {
    runAndReturn: vi.fn().mockImplementation((fn: () => unknown) => fn()),
  };
}

/**
 * Sets up xray.config mocks so that the X-Ray-available code paths execute.
 * @param namespace - The mock namespace (or null for unavailable)
 * @param segment - The mock segment (or null for no active segment)
 */
function setupXRayMocks(
  namespace: ReturnType<typeof createMockNamespace> | null,
  segment: ReturnType<typeof createMockSegment> | null
): void {
  vi.doMock(XRAY_CONFIG_MODULE, () => ({
    getXRayNamespace: vi.fn().mockReturnValue(namespace),
    getXRaySegment: vi.fn().mockReturnValue(segment),
  }));
}

describe("withXRaySubsegment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("graceful degradation", () => {
    it("should execute function and return result when X-Ray unavailable", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();
      const expectedResult = { id: "123", name: "Test User" };

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => expectedResult
      );

      expect(result).toEqual(expectedResult);
    });

    it("should work with primitive return values", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => 42
      );

      expect(result).toBe(42);
    });

    it("should work with void functions", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();
      const sideEffect = vi.fn();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => {
        sideEffect();
      });

      expect(sideEffect).toHaveBeenCalledTimes(1);
    });

    it("should execute function directly when namespace is null", async () => {
      setupXRayMocks(null, null);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "no-namespace-result"
      );

      expect(result).toBe("no-namespace-result");
    });

    it("should execute function when namespace exists but segment is null", async () => {
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, null);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "no-segment-result"
      );

      expect(result).toBe("no-segment-result");
      expect(mockNamespace.runAndReturn).toHaveBeenCalledTimes(1);
    });

    it("should execute function when subsegment creation fails", async () => {
      const mockNamespace = createMockNamespace();
      const mockSegment = {
        addNewSubsegment: vi.fn().mockImplementation(() => {
          throw new Error("Subsegment creation failed");
        }),
      };

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "fallback-result"
      );

      expect(result).toBe("fallback-result");
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create subsegment")
      );
    });

    it("should log non-Error thrown during subsegment creation as Unknown error", async () => {
      const mockNamespace = createMockNamespace();
      const mockSegment = {
        addNewSubsegment: vi.fn().mockImplementation(() => {
          throw NON_ERROR_THROW_VALUE;
        }),
      };

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error")
      );
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from wrapped function", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();
      const expectedError = new Error("Operation failed");

      const failingFn = async (): Promise<void> => {
        throw expectedError;
      };

      await expect(
        withXRaySubsegment("failing-operation", failingFn)
      ).rejects.toThrow("Operation failed");
    });

    it("should preserve error stack trace", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();
      const expectedError = new Error("Stack trace test");

      const failingFn = async (): Promise<void> => {
        throw expectedError;
      };

      try {
        await withXRaySubsegment("failing-operation", failingFn);
      } catch (error) {
        expect(error).toBe(expectedError);
        expect((error as Error).stack).toBeDefined();
      }
    });
  });

  describe("async function support", () => {
    it("should work with async functions", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const asyncOperation = async (): Promise<string> => {
        // Simulate async operation
        await delay(10);
        return "async result";
      };

      const result = await withXRaySubsegment(
        "async-operation",
        asyncOperation
      );

      expect(result).toBe("async result");
    });

    it("should handle promise rejection", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const rejectingFn = async (): Promise<void> => {
        await Promise.reject(new Error("Promise rejected"));
      };

      await expect(
        withXRaySubsegment("rejecting-operation", rejectingFn)
      ).rejects.toThrow("Promise rejected");
    });
  });

  describe("options handling", () => {
    it("should accept annotations option without error", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        "annotated-operation",
        async () => "result",
        {
          annotations: {
            userId: "123",
            operationType: "test",
            isAdmin: true,
          },
        }
      );

      expect(result).toBe("result");
    });

    it("should accept metadata option without error", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        "metadata-operation",
        async () => "result",
        {
          metadata: {
            complexObject: { nested: { data: [1, 2, 3] } },
            timestamp: new Date().toISOString(),
          },
        }
      );

      expect(result).toBe("result");
    });

    it("should accept both annotations and metadata", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        "full-options-operation",
        async () => "result",
        {
          annotations: { userId: "123" },
          metadata: { requestBody: { key: "value" } },
        }
      );

      expect(result).toBe("result");
    });
  });

  describe("type safety", () => {
    it("should preserve generic return type", async () => {
      const withXRaySubsegment = await getWithXRaySubsegment();

      /**
       * Test interface for type checking.
       */
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const getUserFn = async (): Promise<User> => ({
        id: "123",
        name: "Test User",
        email: "test@example.com",
      });

      const user: User = await withXRaySubsegment<User>(
        "typed-operation",
        getUserFn
      );

      expect(user.id).toBe("123");
      expect(user.name).toBe("Test User");
      expect(user.email).toBe("test@example.com");
    });
  });

  describe("X-Ray available - subsegment lifecycle", () => {
    it("should create subsegment, execute function, and close subsegment on success", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "traced-result"
      );

      expect(result).toBe("traced-result");
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith(
        TEST_OPERATION_NAME
      );
      expect(mockSubsegment.isClosed).toHaveBeenCalled();
      expect(mockSubsegment.close).toHaveBeenCalled();
    });

    it("should not close subsegment if already closed", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.isClosed.mockReturnValue(true);
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockSubsegment.isClosed).toHaveBeenCalled();
      expect(mockSubsegment.close).not.toHaveBeenCalled();
    });

    it("should close subsegment even when function throws", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await expect(
        withXRaySubsegment(TEST_OPERATION_NAME, async () => {
          throw new Error("operation-error");
        })
      ).rejects.toThrow("operation-error");

      expect(mockSubsegment.close).toHaveBeenCalled();
    });

    it("should log warning when close throws an Error", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.close.mockImplementation(() => {
        throw new Error("close failed");
      });
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("Error closing subsegment")
      );
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("close failed")
      );
    });

    it("should log Unknown error when close throws a non-Error", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.close.mockImplementation(() => {
        throw "non-error-close";
      });
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error")
      );
    });
  });

  describe("X-Ray available - annotations", () => {
    it("should call addAnnotation for each annotation entry", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result", {
        annotations: {
          userId: "user-42",
          count: 7,
          active: true,
        },
      });

      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "userId",
        "user-42"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith("count", 7);
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith("active", true);
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledTimes(3);
    });

    it("should not call addAnnotation when annotations option is omitted", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockSubsegment.addAnnotation).not.toHaveBeenCalled();
    });

    it("should silently ignore addAnnotation failures", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.addAnnotation.mockImplementation(() => {
        throw new Error("annotation error");
      });
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "result",
        { annotations: { key: "value" } }
      );

      expect(result).toBe("result");
    });
  });

  describe("X-Ray available - metadata", () => {
    it("should call addMetadata with details key", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();
      const metadata = { requestBody: { key: "value" }, timestamp: 12345 };

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result", {
        metadata,
      });

      expect(mockSubsegment.addMetadata).toHaveBeenCalledWith(
        "details",
        metadata
      );
    });

    it("should not call addMetadata when metadata option is omitted", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "result");

      expect(mockSubsegment.addMetadata).not.toHaveBeenCalled();
    });

    it("should silently ignore addMetadata failures", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.addMetadata.mockImplementation(() => {
        throw new Error("metadata error");
      });
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      const result = await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "result",
        { metadata: { key: "value" } }
      );

      expect(result).toBe("result");
    });
  });

  describe("X-Ray available - error recording", () => {
    it("should record Error on subsegment when function throws", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();
      const thrownError = new Error("traced-error");

      await expect(
        withXRaySubsegment(TEST_OPERATION_NAME, async () => {
          throw thrownError;
        })
      ).rejects.toThrow("traced-error");

      expect(mockSubsegment.addError).toHaveBeenCalledWith(thrownError);
    });

    it("should not call addError for non-Error throws", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await expect(
        withXRaySubsegment(TEST_OPERATION_NAME, async () => {
          throw NON_ERROR_THROW_VALUE;
        })
      ).rejects.toBe(NON_ERROR_THROW_VALUE);

      expect(mockSubsegment.addError).not.toHaveBeenCalled();
    });

    it("should silently ignore addError failures", async () => {
      const mockSubsegment = createMockSubsegment();

      mockSubsegment.addError.mockImplementation(() => {
        throw new Error("addError failed");
      });
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await expect(
        withXRaySubsegment(TEST_OPERATION_NAME, async () => {
          throw new Error("original-error");
        })
      ).rejects.toThrow("original-error");
    });

    it("should still close subsegment after error recording", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await expect(
        withXRaySubsegment(TEST_OPERATION_NAME, async () => {
          throw new Error("error-then-close");
        })
      ).rejects.toThrow("error-then-close");

      expect(mockSubsegment.addError).toHaveBeenCalled();
      expect(mockSubsegment.close).toHaveBeenCalled();
    });
  });

  describe("X-Ray available - combined annotations and metadata", () => {
    it("should add both annotations and metadata to subsegment", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();
      const metadata = { payload: { nested: true } };

      await withXRaySubsegment(
        TEST_OPERATION_NAME,
        async () => "combined-result",
        {
          annotations: { operationType: "test", count: 5 },
          metadata,
        }
      );

      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith(
        "operationType",
        "test"
      );
      expect(mockSubsegment.addAnnotation).toHaveBeenCalledWith("count", 5);
      expect(mockSubsegment.addMetadata).toHaveBeenCalledWith(
        "details",
        metadata
      );
    });
  });

  describe("X-Ray available - namespace.runAndReturn", () => {
    it("should invoke namespace.runAndReturn for async context propagation", async () => {
      const mockSubsegment = createMockSubsegment();
      const mockSegment = createMockSegment(mockSubsegment);
      const mockNamespace = createMockNamespace();

      setupXRayMocks(mockNamespace, mockSegment);

      const withXRaySubsegment = await getWithXRaySubsegment();

      await withXRaySubsegment(TEST_OPERATION_NAME, async () => "ns-result");

      expect(mockNamespace.runAndReturn).toHaveBeenCalledTimes(1);
      expect(mockNamespace.runAndReturn).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });
});

/* eslint-enable max-lines -- end of comprehensive X-Ray subsegment test coverage */
