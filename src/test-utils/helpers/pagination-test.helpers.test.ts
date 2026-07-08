import { expect } from "vitest";
import type { Connection, ConnectionArgs } from "../relay.types";
import {
  assertConnectionStructure,
  createEmptyConnection,
  createMockConnection,
  createMockConnectionArgs,
  createMockCursor,
  createMockEdge,
  createMockPageInfo,
  createMockPaginatedResult,
  decodeCursor,
  testPaginationBehavior,
} from "./pagination-test.helpers";

describe("createMockConnectionArgs", () => {
  it("should default to the first ten items", () => {
    const args = createMockConnectionArgs();

    expect(args.first).toBe(10);
    expect(args.after).toBeUndefined();
  });

  it("should apply overrides", () => {
    const args = createMockConnectionArgs({ first: 3, after: "cursor-3" });

    expect(args.first).toBe(3);
    expect(args.after).toBe("cursor-3");
  });
});

describe("createMockPageInfo", () => {
  it("should default to a single empty page", () => {
    const pageInfo = createMockPageInfo();

    expect(pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
  });

  it("should apply overrides", () => {
    const pageInfo = createMockPageInfo({ hasNextPage: true });

    expect(pageInfo.hasNextPage).toBe(true);
  });
});

describe("createMockEdge", () => {
  it("should wrap a node with its cursor", () => {
    const edge = createMockEdge("node-value", "cursor-1");

    expect(edge).toEqual({ node: "node-value", cursor: "cursor-1" });
  });
});

describe("createMockConnection", () => {
  it("should create edges with sequential cursors", () => {
    const connection = createMockConnection(["a", "b"]);

    expect(connection.edges).toHaveLength(2);
    expect(connection.edges[0].cursor).toBe("cursor-1");
    expect(connection.edges[1].cursor).toBe("cursor-2");
    expect(connection.pageInfo.startCursor).toBe("cursor-1");
    expect(connection.pageInfo.endCursor).toBe("cursor-2");
  });

  it("should honor page info overrides", () => {
    const connection = createMockConnection(["a"], { hasNextPage: true });

    expect(connection.pageInfo.hasNextPage).toBe(true);
  });
});

describe("createEmptyConnection", () => {
  it("should create a connection with no edges", () => {
    const connection = createEmptyConnection<string>();

    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo.startCursor).toBeNull();
    expect(connection.pageInfo.endCursor).toBeNull();
  });
});

describe("assertConnectionStructure", () => {
  it("should validate a well-formed connection", () => {
    const connection = createMockConnection(["a", "b", "c"]);

    assertConnectionStructure(connection, 3);
  });
});

describe("createMockCursor and decodeCursor", () => {
  it("should round-trip a plain id", () => {
    expect(decodeCursor(createMockCursor("widget-1"))).toBe("widget-1");
  });

  it("should round-trip a prefixed id", () => {
    expect(decodeCursor(createMockCursor("widget-1", "widget"))).toBe(
      "widget:widget-1"
    );
  });
});

describe("testPaginationBehavior", () => {
  const items = Array.from({ length: 12 }, (_, index) => `item-${index}`);

  const buildPage = (
    slice: string[],
    start: number,
    extra: { hasNextPage?: boolean; hasPreviousPage?: boolean }
  ): Connection<string> => {
    const edges = slice.map((node, index) =>
      createMockEdge(node, createMockCursor(String(start + index)))
    );
    return {
      edges,
      pageInfo: createMockPageInfo({
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
        ...extra,
      }),
    };
  };

  const createFetchFn =
    (data: string[]) =>
    async (args: ConnectionArgs): Promise<Connection<string>> => {
      if (args.last !== undefined) {
        const start = Math.max(data.length - args.last, 0);
        return buildPage(data.slice(start), start, {
          hasPreviousPage: start > 0,
          hasNextPage: false,
        });
      }

      const start = args.after ? Number(decodeCursor(args.after)) + 1 : 0;
      const first = args.first ?? data.length;
      return buildPage(data.slice(start, start + first), start, {
        hasNextPage: start + first < data.length,
        hasPreviousPage: start > 0,
      });
    };

  it("should validate forward and backward pagination", async () => {
    await testPaginationBehavior(createFetchFn(items), items.length);
  });

  it("should validate a collection that fits in one page", async () => {
    await testPaginationBehavior(createFetchFn(items.slice(0, 5)), 5);
  });
});

describe("createMockPaginatedResult", () => {
  it("should create a result with a cursor for non-empty nodes", () => {
    const result = createMockPaginatedResult(["a", "b"], true);

    expect(result.nodes).toEqual(["a", "b"]);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe(createMockCursor("2"));
  });

  it("should use a null cursor for empty nodes", () => {
    const result = createMockPaginatedResult([]);

    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });
});
