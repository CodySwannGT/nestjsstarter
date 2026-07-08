import { expect, vi } from "vitest";
import {
  asMockService,
  createMockService,
  createMockServiceWithDefaults,
} from "./mock-service.factory";

/**
 * Sample service contract used to exercise the mock factories
 */
interface SampleService {
  getGreeting(name: string): string;
  countMembers(): Promise<number>;
}

describe("createMockService", () => {
  it("should create a vi.fn() for every requested method", () => {
    const mock = createMockService<SampleService>([
      "getGreeting",
      "countMembers",
    ]);

    expect(vi.isMockFunction(mock.getGreeting)).toBe(true);
    expect(vi.isMockFunction(mock.countMembers)).toBe(true);
  });

  it("should create independent mocks per method", () => {
    const mock = createMockService<SampleService>([
      "getGreeting",
      "countMembers",
    ]);

    mock.getGreeting("acme");

    expect(mock.getGreeting).toHaveBeenCalledWith("acme");
    expect(mock.countMembers).not.toHaveBeenCalled();
  });
});

describe("createMockServiceWithDefaults", () => {
  it("should return static default values", () => {
    const mock = createMockServiceWithDefaults<SampleService>({
      getGreeting: "Hello, member@example.com!",
    });

    expect(mock.getGreeting("ignored")).toBe("Hello, member@example.com!");
  });

  it("should use function defaults as implementations", () => {
    const mock = createMockServiceWithDefaults<SampleService>({
      getGreeting: (name: string) => `Hello, ${name}!`,
    });

    expect(mock.getGreeting("acme")).toBe("Hello, acme!");
  });

  it("should return promise defaults as-is", async () => {
    const mock = createMockServiceWithDefaults<SampleService>({
      countMembers: Promise.resolve(3),
    });

    await expect(mock.countMembers()).resolves.toBe(3);
  });
});

describe("asMockService", () => {
  it("should return the same instance typed as a mock service", () => {
    const mock = createMockService<SampleService>(["getGreeting"]);
    const typed = asMockService<SampleService>(mock as SampleService);

    expect(typed).toBe(mock);
  });
});
