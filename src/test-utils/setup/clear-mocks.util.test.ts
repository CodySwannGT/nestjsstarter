import { expect, vi } from "vitest";
import {
  MockCallTracker,
  clearMocks,
  globalMockTracker,
  setupAutoClearMocks,
} from "./clear-mocks.util";

describe("clearMocks", () => {
  it("should clear specific mocks only", () => {
    const cleared = vi.fn();
    const untouched = vi.fn();
    cleared();
    untouched();

    clearMocks({ specificMocks: [cleared] });

    expect(cleared).not.toHaveBeenCalled();
    expect(untouched).toHaveBeenCalledTimes(1);
  });

  it("should reset specific mocks when resetMocks is set", () => {
    const mock = vi.fn().mockReturnValue("value");

    clearMocks({ specificMocks: [mock], resetMocks: true });

    expect(mock()).toBeUndefined();
  });

  it("should restore specific mocks when restoreMocks is set", () => {
    const target = { greet: (): string => "original" };
    const spy = vi.spyOn(target, "greet").mockReturnValue("mocked");

    clearMocks({ specificMocks: [spy], restoreMocks: true });

    expect(target.greet()).toBe("original");
  });

  it("should clear all mocks when no specific mocks are given", () => {
    const mock = vi.fn();
    mock();

    clearMocks();

    expect(mock).not.toHaveBeenCalled();
  });

  it("should reset all mocks when resetMocks is set", () => {
    const mock = vi.fn().mockReturnValue("value");

    clearMocks({ resetMocks: true });

    expect(mock()).toBeUndefined();
  });

  it("should restore all mocks when restoreMocks is set", () => {
    const target = { greet: (): string => "original" };
    vi.spyOn(target, "greet").mockReturnValue("mocked");

    clearMocks({ restoreMocks: true });

    expect(target.greet()).toBe("original");
  });
});

describe("setupAutoClearMocks", () => {
  const shared = vi.fn();

  setupAutoClearMocks();

  it("should record calls inside the first test", () => {
    shared();
    expect(shared).toHaveBeenCalledTimes(1);
  });

  it("should have cleared calls before the next test", () => {
    expect(shared).not.toHaveBeenCalled();
  });
});

describe("MockCallTracker", () => {
  it("should track call counts and arguments", () => {
    const tracker = new MockCallTracker();
    const mock = vi.fn();
    tracker.track("greet", mock);

    mock("alpha");
    mock("beta", 2);

    expect(tracker.getCallCount("greet")).toBe(2);
    expect(tracker.getCalls("greet")).toEqual([["alpha"], ["beta", 2]]);
    expect(tracker.getLastCall("greet")).toEqual(["beta", 2]);
  });

  it("should return zero and empty results for unknown mocks", () => {
    const tracker = new MockCallTracker();

    expect(tracker.getCallCount("missing")).toBe(0);
    expect(tracker.getCalls("missing")).toEqual([]);
    expect(tracker.getLastCall("missing")).toBeUndefined();
  });

  it("should assert calls with specific arguments", () => {
    const tracker = new MockCallTracker();
    const mock = vi.fn();
    tracker.track("greet", mock);
    mock("acme");

    tracker.assertCalledWith("greet", "acme");
    tracker.assertCallCount("greet", 1);
  });

  it("should throw when asserting on an unknown mock", () => {
    const tracker = new MockCallTracker();

    expect(() => tracker.assertCalledWith("missing", "any")).toThrow(
      "Mock 'missing' not found in tracker"
    );
  });

  it("should clear tracked mocks without unregistering them", () => {
    const tracker = new MockCallTracker();
    const mock = vi.fn();
    tracker.track("greet", mock);
    mock();

    tracker.clear();

    expect(tracker.getCallCount("greet")).toBe(0);
    mock();
    expect(tracker.getCallCount("greet")).toBe(1);
  });

  it("should reset the tracker entirely", () => {
    const tracker = new MockCallTracker();
    const mock = vi.fn();
    tracker.track("greet", mock);
    mock();

    tracker.reset();
    mock();

    expect(tracker.getCallCount("greet")).toBe(0);
  });
});

describe("globalMockTracker", () => {
  it("should be a shared MockCallTracker instance", () => {
    expect(globalMockTracker).toBeInstanceOf(MockCallTracker);
  });
});
