import { expect } from "vitest";
import {
  createEmptyConnection,
  createMockConnection,
  createMockConnectionWithCount,
  createMockEdges,
  createMockPageInfo,
  decodeCursor,
} from "./mock-connection.factory";

describe("createMockEdges", () => {
  it("should create an edge per item with sequential cursors", () => {
    const edges = createMockEdges(["a", "b"]);

    expect(edges).toHaveLength(2);
    expect(edges[0].node).toBe("a");
    expect(decodeCursor(edges[0].cursor)).toBe(0);
    expect(decodeCursor(edges[1].cursor)).toBe(1);
  });

  it("should honor a start offset", () => {
    const edges = createMockEdges(["a"], 5);

    expect(decodeCursor(edges[0].cursor)).toBe(5);
  });
});

describe("createMockPageInfo", () => {
  it("should use first and last edge cursors", () => {
    const edges = createMockEdges(["a", "b", "c"]);
    const pageInfo = createMockPageInfo(edges, true, false);

    expect(pageInfo.hasNextPage).toBe(true);
    expect(pageInfo.hasPreviousPage).toBe(false);
    expect(pageInfo.startCursor).toBe(edges[0].cursor);
    expect(pageInfo.endCursor).toBe(edges[2].cursor);
  });

  it("should use null cursors when there are no edges", () => {
    const pageInfo = createMockPageInfo([]);

    expect(pageInfo.startCursor).toBeNull();
    expect(pageInfo.endCursor).toBeNull();
  });
});

describe("createMockConnection", () => {
  it("should build a connection from items", () => {
    const connection = createMockConnection(["a", "b"], true, true);

    expect(connection.edges).toHaveLength(2);
    expect(connection.pageInfo.hasNextPage).toBe(true);
    expect(connection.pageInfo.hasPreviousPage).toBe(true);
  });

  it("should default to an empty connection", () => {
    const connection = createMockConnection();

    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo.hasNextPage).toBe(false);
  });
});

describe("createMockConnectionWithCount", () => {
  it("should default totalCount to the item count", () => {
    const connection = createMockConnectionWithCount(["a", "b"]);

    expect(connection.totalCount).toBe(2);
  });

  it("should honor an explicit totalCount", () => {
    const connection = createMockConnectionWithCount(["a"], 42);

    expect(connection.totalCount).toBe(42);
  });
});

describe("createEmptyConnection", () => {
  it("should build a connection with no edges and null cursors", () => {
    const connection = createEmptyConnection<string>();

    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
  });
});
