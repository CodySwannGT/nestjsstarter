import { expect, vi } from "vitest";
import {
  createMockProvider,
  createMockProviders,
  setupTestingModule,
  withTestingModule,
} from "./testing-module.setup";

/**
 * Simple service used to exercise the testing-module helpers
 */
class ProbeService {
  destroyed = false;

  /**
   * Marks the service as destroyed when the module closes
   */
  onModuleDestroy(): void {
    this.destroyed = true;
  }

  /**
   * Returns a static greeting
   * @returns Greeting string
   */
  greet(): string {
    return "Hello, acme!";
  }
}

describe("setupTestingModule", () => {
  it("should compile the module and resolve the provider", async () => {
    const context = await setupTestingModule({ provider: ProbeService });

    expect(context.provider).toBeInstanceOf(ProbeService);
    expect(context.provider.greet()).toBe("Hello, acme!");

    await context.module.close();
  });

  it("should expose a get helper for other providers", async () => {
    const context = await setupTestingModule({
      provider: ProbeService,
      providers: [{ provide: "CONFIG", useValue: { flag: true } }],
    });

    expect(context.get<{ flag: boolean }>("CONFIG")).toEqual({ flag: true });

    await context.module.close();
  });

  it("should apply customizeModule overrides", async () => {
    const replacement = { greet: vi.fn().mockReturnValue("override") };
    const context = await setupTestingModule({
      provider: ProbeService,
      customizeModule: builder =>
        builder.overrideProvider(ProbeService).useValue(replacement),
    });

    expect(context.provider.greet()).toBe("override");

    await context.module.close();
  });

  it("should clear all mocks via clearAllMocks", async () => {
    const context = await setupTestingModule({ provider: ProbeService });
    const spy = vi.fn();
    spy();

    context.clearAllMocks();

    expect(spy).not.toHaveBeenCalled();

    await context.module.close();
  });
});

describe("createMockProvider", () => {
  it("should build a useValue provider", () => {
    const provider = createMockProvider("TOKEN", { value: 1 });

    expect(provider).toEqual({ provide: "TOKEN", useValue: { value: 1 } });
  });
});

describe("createMockProviders", () => {
  it("should build a provider per entry", () => {
    const providers = createMockProviders({ A: 1, B: 2 });

    expect(providers).toEqual([
      { provide: "A", useValue: 1 },
      { provide: "B", useValue: 2 },
    ]);
  });
});

describe("withTestingModule", () => {
  it("should run the test function and close the module afterwards", async () => {
    const seen: ProbeService[] = [];

    await withTestingModule({ provider: ProbeService }, context => {
      seen.push(context.provider);
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].destroyed).toBe(true);
  });

  it("should close the module even when the test function throws", async () => {
    const seen: ProbeService[] = [];

    await expect(
      withTestingModule({ provider: ProbeService }, context => {
        seen.push(context.provider);
        throw new Error("test failure");
      })
    ).rejects.toThrow("test failure");

    expect(seen[0].destroyed).toBe(true);
  });
});
