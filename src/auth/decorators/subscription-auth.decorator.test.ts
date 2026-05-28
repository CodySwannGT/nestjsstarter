/**
 * @file subscription-auth.decorator.test.ts
 * @description Unit tests for subscription auth decorators
 * @module auth/decorators
 * @remarks
 * Tests verify that shorthand decorators correctly configure auth extensions
 * and filter options for subscription authorization.
 */

import { vi, expect, type Mock } from "vitest";
import { Extensions } from "@nestjs/graphql";
import {
  GroupsSubscription,
  OwnerSubscription,
  PublicSubscription,
  AuthedSubscription,
  SubscriptionAuth,
  SUBSCRIPTION_FILTER_KEY,
} from "./subscription-auth.decorator";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";
import { AuthLevel } from "../auth.types";

/** Reusable owner filter option for tests */
const OWNER_FILTER = { owner: true } as const;

/** Reusable multi-field filter option for tests */
const OWNER_RESOURCE_FILTER = { owner: true, resourceId: true } as const;

vi.mock("@nestjs/graphql", () => ({
  Extensions: vi.fn(() => () => undefined),
}));

vi.mock("@nestjs/common", () => ({
  applyDecorators: vi.fn((...decorators: unknown[]) => decorators[0]),
}));

describe("SubscriptionAuth decorators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SubscriptionAuth", () => {
    it("should create a public subscription with Extensions", () => {
      SubscriptionAuth({ auth: "public" });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.PUBLIC }],
          },
        })
      );
    });

    it("should create an authed subscription with Extensions", () => {
      SubscriptionAuth({ auth: "authed" });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.AUTHED }],
          },
        })
      );
    });

    it("should create a groups subscription with group names", () => {
      SubscriptionAuth({ auth: "groups", groups: ["admin", "moderator"] });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [
              {
                allow: AuthLevel.GROUPS,
                groups: ["admin", "moderator"],
              },
            ],
          },
        })
      );
    });

    it("should create an owner subscription with ownerField", () => {
      SubscriptionAuth({ auth: "owner", ownerField: "recipientId" });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.OWNER, ownerField: "recipientId" }],
          },
        })
      );
    });

    it("should include filter options in Extensions when provided", () => {
      SubscriptionAuth({
        auth: "authed",
        filter: OWNER_RESOURCE_FILTER,
      });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [SUBSCRIPTION_FILTER_KEY]: OWNER_RESOURCE_FILTER,
        })
      );
    });

    it("should not include filter key when no filter options provided", () => {
      SubscriptionAuth({ auth: "public" });

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall).not.toHaveProperty(SUBSCRIPTION_FILTER_KEY);
    });

    it("should not include groups on non-groups auth level", () => {
      SubscriptionAuth({ auth: "authed", groups: ["admin"] });

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall[AUTH_EXTENSION_KEY].rules[0]).not.toHaveProperty(
        "groups"
      );
    });

    it("should not include ownerField on non-owner auth level", () => {
      SubscriptionAuth({ auth: "authed", ownerField: "userId" });

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall[AUTH_EXTENSION_KEY].rules[0]).not.toHaveProperty(
        "ownerField"
      );
    });
  });

  describe("PublicSubscription", () => {
    it("should configure a PUBLIC auth level", () => {
      PublicSubscription();

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.PUBLIC }],
          },
        })
      );
    });

    it("should not include filter key", () => {
      PublicSubscription();

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall).not.toHaveProperty(SUBSCRIPTION_FILTER_KEY);
    });
  });

  describe("AuthedSubscription", () => {
    it("should configure an AUTHED auth level", () => {
      AuthedSubscription();

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.AUTHED }],
          },
        })
      );
    });

    it("should include owner filter in Extensions when filter options are provided", () => {
      AuthedSubscription(OWNER_FILTER);

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [SUBSCRIPTION_FILTER_KEY]: OWNER_FILTER,
        })
      );
    });

    it("should not include filter when not provided", () => {
      AuthedSubscription();

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall).not.toHaveProperty(SUBSCRIPTION_FILTER_KEY);
    });
  });

  describe("GroupsSubscription", () => {
    it("should configure a GROUPS auth level with specified groups", () => {
      GroupsSubscription(["admin", "users"]);

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [
              {
                allow: AuthLevel.GROUPS,
                groups: ["admin", "users"],
              },
            ],
          },
        })
      );
    });

    it("should include organization filter in Extensions when filter options are provided", () => {
      GroupsSubscription(["admin"], { organization: true });

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [SUBSCRIPTION_FILTER_KEY]: { organization: true },
        })
      );
    });

    it("should work without filter options", () => {
      GroupsSubscription(["moderator"]);

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall).not.toHaveProperty(SUBSCRIPTION_FILTER_KEY);
    });
  });

  describe("OwnerSubscription", () => {
    it("should configure an OWNER auth level", () => {
      OwnerSubscription();

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.OWNER }],
          },
        })
      );
    });

    it("should include ownerField when specified", () => {
      OwnerSubscription("recipientId");

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [AUTH_EXTENSION_KEY]: {
            rules: [{ allow: AuthLevel.OWNER, ownerField: "recipientId" }],
          },
        })
      );
    });

    it("should include owner filter in Extensions when ownerField and filter options are provided", () => {
      OwnerSubscription("userId", OWNER_FILTER);

      expect(Extensions).toHaveBeenCalledWith(
        expect.objectContaining({
          [SUBSCRIPTION_FILTER_KEY]: OWNER_FILTER,
        })
      );
    });

    it("should work without ownerField", () => {
      OwnerSubscription(undefined, { resourceId: true });

      const extensionsCall = (Extensions as Mock).mock.calls[0][0];
      expect(extensionsCall[AUTH_EXTENSION_KEY].rules[0]).not.toHaveProperty(
        "ownerField"
      );
      expect(extensionsCall).toHaveProperty(SUBSCRIPTION_FILTER_KEY);
    });
  });
});
