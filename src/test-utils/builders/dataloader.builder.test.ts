import { expect, vi } from "vitest";
import {
  DataLoaderMockBuilder,
  createMockDataLoaders,
} from "./dataloader.builder";

describe("DataLoaderMockBuilder", () => {
  it("should add a standard loader with a default value", async () => {
    const loaders = new DataLoaderMockBuilder()
      .addLoader("greetingsLoader", "Hello, acme!")
      .build();

    await expect(loaders.greetingsLoader.load("acme")).resolves.toBe(
      "Hello, acme!"
    );
  });

  it("should add an array loader with a default array", async () => {
    const loaders = new DataLoaderMockBuilder()
      .addArrayLoader("greetingsLoader", ["hi", "hello"])
      .build();

    await expect(loaders.greetingsLoader.load("acme")).resolves.toEqual([
      "hi",
      "hello",
    ]);
  });

  it("should add a paginated loader resolving an empty connection", async () => {
    const loaders = new DataLoaderMockBuilder()
      .addPaginatedLoader("greetingsLoader")
      .build();

    await expect(loaders.greetingsLoader.load("acme")).resolves.toEqual({
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    });
  });

  it("should add a custom loader implementation", async () => {
    const customLoader = { load: vi.fn().mockResolvedValue("custom") };
    const loaders = new DataLoaderMockBuilder()
      .addCustomLoader("greetingsLoader", customLoader)
      .build();

    await expect(loaders.greetingsLoader.load("acme")).resolves.toBe("custom");
  });

  it("should register every standard loader via createWithDefaults", () => {
    const loaders = DataLoaderMockBuilder.createWithDefaults().build();

    expect(loaders.greetingsLoader).toBeDefined();
    expect(vi.isMockFunction(loaders.greetingsLoader.load)).toBe(true);
  });
});

describe("createMockDataLoaders", () => {
  it("should create a fully mocked IDataLoaders instance", async () => {
    const loaders = createMockDataLoaders();

    expect(vi.isMockFunction(loaders.greetingsLoader.load)).toBe(true);
    await expect(loaders.greetingsLoader.load("acme")).resolves.toBeUndefined();
  });
});
