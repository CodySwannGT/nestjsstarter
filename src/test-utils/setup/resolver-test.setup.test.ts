import { expect, vi } from "vitest";
import type { IDataLoaders } from "../../data-loader/data-loader.interface";
import { createMockDataLoader } from "../factories/mock-dataloader.factory";
import {
  DATA_LOADERS_TOKEN,
  createMockGraphQLRequestContext,
  createResolverTestSuite,
  setupResolverTest,
} from "./resolver-test.setup";

/**
 * Simple resolver stand-in used to exercise the setup helpers
 */
class FakeResolver {
  /**
   * Returns a static greeting
   * @returns Greeting string
   */
  hello(): string {
    return "Hello, acme!";
  }
}

describe("setupResolverTest", () => {
  it("should resolve the resolver and expose it under both aliases", async () => {
    const context = await setupResolverTest({ resolver: FakeResolver });

    expect(context.resolver).toBeInstanceOf(FakeResolver);
    expect(context.provider).toBe(context.resolver);

    await context.module.close();
  });

  it("should provide fully mocked data loaders by default", async () => {
    const context = await setupResolverTest({ resolver: FakeResolver });

    expect(context.dataLoaders?.greetingsLoader).toBeDefined();
    expect(context.get<IDataLoaders>(DATA_LOADERS_TOKEN)).toBe(
      context.dataLoaders
    );

    await context.module.close();
  });

  it("should merge data loader overrides from an object", async () => {
    const greetingsLoader = createMockDataLoader<string, string>("override");
    const context = await setupResolverTest({
      resolver: FakeResolver,
      dataLoaders: { greetingsLoader },
    });

    expect(context.dataLoaders?.greetingsLoader).toBe(greetingsLoader);

    await context.module.close();
  });

  it("should merge data loader overrides from a factory function", async () => {
    const greetingsLoader = createMockDataLoader<string, string>("factory");
    const context = await setupResolverTest({
      resolver: FakeResolver,
      dataLoaders: () => ({ greetingsLoader }),
    });

    expect(context.dataLoaders?.greetingsLoader).toBe(greetingsLoader);

    await context.module.close();
  });

  it("should skip data loaders when provideDataLoaders is false", async () => {
    const context = await setupResolverTest({
      resolver: FakeResolver,
      provideDataLoaders: false,
    });

    expect(context.dataLoaders).toBeUndefined();
    expect(() => context.get(DATA_LOADERS_TOKEN)).toThrow();

    await context.module.close();
  });

  it("should pass extra providers through", async () => {
    const context = await setupResolverTest({
      resolver: FakeResolver,
      providers: [{ provide: "EXTRA", useValue: "extra-value" }],
    });

    expect(context.get<string>("EXTRA")).toBe("extra-value");

    await context.module.close();
  });
});

describe("createResolverTestSuite", () => {
  describe(
    "generated suite",
    createResolverTestSuite(FakeResolver, { EXTRA: vi.fn() })
  );
});

describe("createMockGraphQLRequestContext", () => {
  it("should create a default request context", () => {
    const context = createMockGraphQLRequestContext();

    expect(context.req.headers).toEqual({});
    expect(context.req.user).toBeNull();
    expect(context.res.locals).toEqual({});
    expect(context.dataSources).toEqual({});
  });

  it("should apply overrides", () => {
    const user = { email: "member@example.com" };
    const context = createMockGraphQLRequestContext({
      req: { headers: { authorization: "token" }, user },
      extra: "value",
    });

    expect(context.req.user).toBe(user);
    expect(context.req.headers.authorization).toBe("token");
    expect(context.extra).toBe("value");
  });
});
