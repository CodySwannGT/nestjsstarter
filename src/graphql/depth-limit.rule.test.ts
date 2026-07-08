/**
 * @file depth-limit.rule.test.ts
 * @description Unit tests for the native depth-limit validation rule
 * @module graphql
 */

import { expect } from "vitest";
import { buildSchema, getIntrospectionQuery, parse, validate } from "graphql";
import type { GraphQLError } from "graphql";
import { depthLimitRule } from "./depth-limit.rule";

/**
 * Self-referential schema so depth is trivial to grow: `node` returns a `Node`
 * which again exposes `child: Node`, letting a query nest arbitrarily deep.
 */
const schema = buildSchema(`
  type Query { node: Node  scalar: String }
  type Node  { child: Node  value: String }
`);

/**
 * Validate a query with only the depth rule under test at the given limit.
 * @param query - GraphQL document string.
 * @param max - Maximum allowed depth injected into the rule factory.
 * @returns The array of validation errors (empty when the query is within limit).
 */
const run = (query: string, max = 3): readonly GraphQLError[] =>
  validate(schema, parse(query), [depthLimitRule(max)]);

describe("depthLimitRule", () => {
  it("D1: passes a depth-1 scalar selection", () => {
    expect(run("{ scalar }").length).toBe(0);
  });

  it("D2: passes a depth-2 selection", () => {
    expect(run("{ node { value } }").length).toBe(0);
  });

  it("D3: passes a selection exactly at the limit", () => {
    expect(run("{ node { child { value } } }").length).toBe(0);
  });

  it("D4: rejects a selection one level over the limit with the exact contract", () => {
    const errors = run("{ node { child { child { value } } } }");
    expect(errors.length).toBe(1);
    expect(errors[0].extensions?.code).toBe("QUERY_TOO_DEEP");
    expect(errors[0].message).toBe(
      "Query exceeds the maximum operation depth of 3."
    );
  });

  it("D5: aliases do not inflate depth", () => {
    expect(run("{ a: node { value } }").length).toBe(0);
  });

  it("D6: a mixed __typename + real field is not exempt and counts only real depth", () => {
    expect(run("{ __typename node { value } }").length).toBe(0);
  });

  it("D7: inline fragments do not add a depth level", () => {
    expect(run("{ node { ... on Node { child { value } } } }").length).toBe(0);
  });

  it("D8: fragment spreads do not add a depth level", () => {
    const query = `query { node { ...F } } fragment F on Node { child { value } }`;
    expect(run(query).length).toBe(0);
  });

  it("D9: a full introspection query is exempt despite its depth", () => {
    expect(run(getIntrospectionQuery(), 3).length).toBe(0);
  });

  it("D10: a cyclic fragment terminates and still reports over-depth", () => {
    const query = `query { node { ...F } } fragment F on Node { child { ...F } }`;
    const errors = run(query, 3);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(
      errors.some(error => error.extensions?.code === "QUERY_TOO_DEEP")
    ).toBe(true);
  });

  it("D11: a document deeper than MAX_VALIDATION_DEPTH terminates promptly with an over-depth error", () => {
    const errors = run(
      `{ node ${"{ child ".repeat(60)} { value } ${"}".repeat(60)} }`,
      12
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(
      errors.some(error => error.extensions?.code === "QUERY_TOO_DEEP")
    ).toBe(true);
  });

  it("D12: rejects a deep diamond-fragment bomb in O(N), not O(2^N) (perf regression)", () => {
    // Each fragment spreads the next-smaller TWICE — naive recursion expands
    // 2^levels (≈33M calls at 25 levels → ~30s Lambda timeout). Memoizing each
    // fragment's intrinsic depth by name makes this O(N). The doc is also deep
    // (each level adds a `child`), so it must be REJECTED — and fast.
    const levels = 25;
    const fragments = [
      "fragment f0 on Node { value }",
      ...Array.from({ length: levels }, (_value, index) => {
        const n = index + 1;
        return `fragment f${n} on Node { child { ...f${n - 1} ...f${n - 1} } }`;
      }),
    ];
    const bomb = `query { node { ...f${levels} } } ${fragments.join(" ")}`;

    const start = performance.now();
    const errors = run(bomb, 12);
    const elapsedMs = performance.now() - start;

    expect(
      errors.some(error => error.extensions?.code === "QUERY_TOO_DEEP")
    ).toBe(true);
    // O(N) memoized runs ~0.6ms; the pre-fix O(2^N) was ~7500ms+. 250ms leaves
    // ample headroom for shared-CI GC/contention noise while still failing hard
    // if the exponential regression ever returns.
    expect(elapsedMs).toBeLessThan(250);
  });
});
