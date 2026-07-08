/**
 * @file limit-error-format.test.ts
 * @description Unit tests for the Apollo formatError hook that restores the
 * depth-limit error code
 * @module graphql
 */

import { expect } from "vitest";
import { GraphQLError } from "graphql";
import type { GraphQLFormattedError } from "graphql";
import { formatLimitError } from "./limit-error-format";

/**
 * Build the formatted/original error pair Apollo passes to `formatError`: the
 * formatted error already had its `code` forced to `GRAPHQL_VALIDATION_FAILED`
 * by Apollo's ValidationError wrapper, while the original error chain still
 * carries our intended limit code on `originalError`.
 * @param limitCode - The limit code on the original GraphQLError (or undefined).
 * @returns The formatted error and the wrapping original error.
 */
const apolloPair = (
  limitCode: string | undefined
): { formatted: GraphQLFormattedError; original: unknown } => {
  const formatted: GraphQLFormattedError = {
    message: "boom",
    extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
  };
  const original = {
    extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
    originalError: limitCode
      ? new GraphQLError("boom", { extensions: { code: limitCode } })
      : undefined,
  };
  return { formatted, original };
};

describe("formatLimitError", () => {
  it("restores QUERY_TOO_DEEP from the original error chain", () => {
    const { formatted, original } = apolloPair("QUERY_TOO_DEEP");
    expect(formatLimitError(formatted, original).extensions?.code).toBe(
      "QUERY_TOO_DEEP"
    );
  });

  it("leaves a non-limit error untouched", () => {
    const { formatted, original } = apolloPair(undefined);
    const result = formatLimitError(formatted, original);
    expect(result.extensions?.code).toBe("GRAPHQL_VALIDATION_FAILED");
    expect(result).toEqual(formatted);
  });

  it("leaves an unrelated custom code untouched", () => {
    const { formatted, original } = apolloPair("SOME_OTHER_CODE");
    const result = formatLimitError(formatted, original);
    expect(result.extensions?.code).toBe("GRAPHQL_VALIDATION_FAILED");
  });

  it("preserves other formatted-error fields when restoring the code", () => {
    const { original } = apolloPair("QUERY_TOO_DEEP");
    const formatted: GraphQLFormattedError = {
      message: "Query exceeds the maximum operation depth of 10.",
      extensions: { code: "GRAPHQL_VALIDATION_FAILED", stacktrace: ["x"] },
    };
    const result = formatLimitError(formatted, original);
    expect(result.message).toBe(
      "Query exceeds the maximum operation depth of 10."
    );
    expect(result.extensions?.stacktrace).toEqual(["x"]);
    expect(result.extensions?.code).toBe("QUERY_TOO_DEEP");
  });

  it("bounds the originalError chain walk (no pathological recursion)", () => {
    const cyclic: { extensions: object; originalError?: unknown } = {
      extensions: {},
    };
    // eslint-disable-next-line functional/immutable-data -- constructing a deliberately cyclic error chain for the bound test
    cyclic.originalError = cyclic;
    const { formatted } = apolloPair(undefined);
    expect(formatLimitError(formatted, cyclic)).toEqual(formatted);
  });

  it("passes through primitives and null originals unchanged", () => {
    const { formatted } = apolloPair(undefined);
    expect(formatLimitError(formatted, null)).toEqual(formatted);
    expect(formatLimitError(formatted, "boom")).toEqual(formatted);
  });
});
