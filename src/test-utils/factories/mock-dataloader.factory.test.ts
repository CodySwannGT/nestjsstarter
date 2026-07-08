import { expect } from "vitest";
import {
  createMockArrayDataLoader,
  createMockDataLoader,
  createMockDataLoaderWithMap,
  createMockPaginatedLoader,
} from "./mock-dataloader.factory";

describe("createMockDataLoader", () => {
  it("should resolve load with the default value", async () => {
    const loader = createMockDataLoader<string, string>("hello");

    await expect(loader.load("any-key")).resolves.toBe("hello");
  });

  it("should resolve loadMany with an empty array by default", async () => {
    const loader = createMockDataLoader<string, string>();

    await expect(loader.loadMany(["a", "b"])).resolves.toEqual([]);
  });

  it("should support chaining for clear, clearAll, and prime", () => {
    const loader = createMockDataLoader<string, string>();

    expect(loader.clear("key")).toBe(loader);
    expect(loader.clearAll()).toBe(loader);
    expect(loader.prime("key", "value")).toBe(loader);
  });
});

describe("createMockDataLoaderWithMap", () => {
  it("should resolve mapped values by key", async () => {
    const loader = createMockDataLoaderWithMap(
      new Map([
        ["alpha", 1],
        ["beta", 2],
      ])
    );

    await expect(loader.load("alpha")).resolves.toBe(1);
    await expect(loader.load("beta")).resolves.toBe(2);
  });

  it("should resolve null for unmapped keys", async () => {
    const loader = createMockDataLoaderWithMap(new Map([["alpha", 1]]));

    await expect(loader.load("missing")).resolves.toBeNull();
  });

  it("should resolve loadMany in key order", async () => {
    const loader = createMockDataLoaderWithMap(
      new Map([
        ["alpha", 1],
        ["beta", 2],
      ])
    );

    await expect(
      loader.loadMany(["beta", "missing", "alpha"])
    ).resolves.toEqual([2, null, 1]);
  });
});

describe("createMockArrayDataLoader", () => {
  it("should resolve load with the default array", async () => {
    const loader = createMockArrayDataLoader<string, number>([1, 2, 3]);

    await expect(loader.load("any-key")).resolves.toEqual([1, 2, 3]);
  });

  it("should resolve an empty array when no default is given", async () => {
    const loader = createMockArrayDataLoader<string, number>();

    await expect(loader.load("any-key")).resolves.toEqual([]);
  });

  it("should resolve loadMany with the default array wrapped", async () => {
    const loader = createMockArrayDataLoader<string, number>([7]);

    await expect(loader.loadMany(["a"])).resolves.toEqual([[7]]);
  });
});

describe("createMockPaginatedLoader", () => {
  it("should resolve load with an empty connection", async () => {
    const loader = createMockPaginatedLoader<string>();

    await expect(loader.load("any-key")).resolves.toEqual({
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    });
  });

  it("should resolve loadMany with an empty array", async () => {
    const loader = createMockPaginatedLoader<string>();

    await expect(loader.loadMany(["a"])).resolves.toEqual([]);
  });
});
