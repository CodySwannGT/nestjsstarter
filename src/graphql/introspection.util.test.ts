/**
 * @file introspection.util.test.ts
 * @description Unit tests for the structural introspection-detection helpers
 * @module graphql
 */

import { expect } from "vitest";
import { parse } from "graphql";
import type { OperationDefinitionNode } from "graphql";
import { isIntrospectionOperation, isMetaField } from "./introspection.util";

/**
 * Parse a single-operation document and return its OperationDefinition node so
 * the introspection helpers can be exercised against a real AST.
 * @param query - GraphQL document string containing exactly one operation.
 * @returns The parsed operation definition node.
 */
const operation = (query: string): OperationDefinitionNode =>
  parse(query).definitions[0] as OperationDefinitionNode;

describe("isMetaField", () => {
  it("returns true for the double-underscore meta fields", () => {
    expect(isMetaField("__typename")).toBe(true);
    expect(isMetaField("__schema")).toBe(true);
    expect(isMetaField("__type")).toBe(true);
  });

  it("returns false for ordinary field names", () => {
    expect(isMetaField("name")).toBe(false);
    expect(isMetaField("item")).toBe(false);
    expect(isMetaField("_private")).toBe(false);
  });
});

describe("isIntrospectionOperation", () => {
  it("is true when every root selection is a meta field", () => {
    expect(
      isIntrospectionOperation(operation("{ __schema { types { name } } }"))
    ).toBe(true);
    expect(
      isIntrospectionOperation(operation('{ __type(name: "Query") { name } }'))
    ).toBe(true);
    expect(isIntrospectionOperation(operation("{ __typename }"))).toBe(true);
  });

  it("is false when any root selection is a non-meta field", () => {
    expect(
      isIntrospectionOperation(operation("{ __typename item { id } }"))
    ).toBe(false);
    expect(isIntrospectionOperation(operation("{ item { id } }"))).toBe(false);
  });
});
