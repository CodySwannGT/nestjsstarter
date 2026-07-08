import { expect, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import {
  assertGraphQLError,
  createMockFieldResolverInfo,
  createMockGqlContext,
  createMockGraphQLContext,
  createMockSubscriptionContext,
  createMockVariables,
  mockCurrentUserDecorator,
} from "./graphql-test.helpers";
import { createGraphQLError } from "./error-test.helpers";

const memberUser = { id: "member-1", email: "member@example.com" };

describe("createMockGqlContext", () => {
  it("should report the graphql context type", () => {
    const context = createMockGqlContext(memberUser);

    expect(context.getType()).toBe("graphql");
  });

  it("should expose the user through the created context", () => {
    const context = createMockGqlContext(memberUser) as ExecutionContext & {
      create: () => { req: { user: typeof memberUser } };
    };

    expect(context.create().req.user).toBe(memberUser);
  });

  it("should merge additional context properties", () => {
    const context = createMockGqlContext(memberUser, {
      custom: "value",
    }) as ExecutionContext & { create: () => { custom: string } };

    expect(context.create().custom).toBe("value");
  });
});

describe("createMockGraphQLContext", () => {
  it("should wrap loaders with additional context", () => {
    const loaders = { greetingsLoader: vi.fn() };
    const context = createMockGraphQLContext(loaders, { requestId: "req-1" });

    expect(context.loaders).toBe(loaders);
    expect(context.requestId).toBe("req-1");
  });
});

describe("mockCurrentUserDecorator", () => {
  it("should return the configured user", () => {
    const decorator = mockCurrentUserDecorator(memberUser);
    const ctx = createMockGqlContext(memberUser);

    expect(decorator(undefined, ctx)).toBe(memberUser);
    expect(decorator).toHaveBeenCalledTimes(1);
  });
});

describe("createMockFieldResolverInfo", () => {
  it("should build resolver info for the field", () => {
    const info = createMockFieldResolverInfo("widgets");

    expect(info.fieldName).toBe("widgets");
    expect(info.fieldNodes?.[0].name.value).toBe("widgets");
    expect(info.parentType?.name).toBe("Query");
    expect(info.path?.key).toBe("widgets");
  });

  it("should honor a custom parent type", () => {
    const info = createMockFieldResolverInfo("widgets", "Mutation");

    expect(info.parentType?.name).toBe("Mutation");
    expect(info.path?.typename).toBe("Mutation");
  });
});

describe("createMockSubscriptionContext", () => {
  it("should build a subscription context", () => {
    const context = createMockSubscriptionContext("conn-1", memberUser);

    expect(context.connectionId).toBe("conn-1");
    expect(context.user).toBe(memberUser);
    expect(context.connectionParams).toEqual({});
    expect(context.extra).toEqual({});
  });

  it("should allow an anonymous connection", () => {
    const context = createMockSubscriptionContext("conn-2");

    expect(context.user).toBeUndefined();
  });
});

describe("assertGraphQLError", () => {
  it("should assert the error code and message", () => {
    const error = createGraphQLError("Denied access", "FORBIDDEN");

    assertGraphQLError(error, "FORBIDDEN", "Denied");
  });
});

describe("createMockVariables", () => {
  it("should return the overrides unchanged", () => {
    const variables = createMockVariables({ id: "widget-1" });

    expect(variables).toEqual({ id: "widget-1" });
  });
});
