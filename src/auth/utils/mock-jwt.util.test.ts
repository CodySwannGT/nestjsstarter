/**
 * @file mock-jwt.util.test.ts
 * @description Unit tests for mock JWT generation utilities
 * @module auth/utils
 */
import { expect } from "vitest";
import {
  decodeMockToken,
  generateDeterministicUserId,
  generateMockAccessToken,
  generateMockIdToken,
  generateMockRefreshToken,
  isTokenExpired,
} from "./mock-jwt.util";

const TEST_EMAIL = "test@example.com";
const TEST_USER_ID = "user-123";

/**
 * Decodes base64url string to object
 * @param base64url - Base64url encoded string
 * @returns Decoded object
 */
function decodeBase64Url(base64url: string): object {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json);
}

describe("generateMockAccessToken", () => {
  it("should create valid JWT structure", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const parts = token.split(".");

    expect(parts).toHaveLength(3);
  });

  it("should have alg none in header", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const [headerPart] = token.split(".");
    const header = decodeBase64Url(headerPart) as { alg: string; typ: string };

    expect(header.alg).toBe("none");
    expect(header.typ).toBe("JWT");
  });

  it("should include userId in payload", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as {
      "custom:realUserId": string;
    };

    expect(payload["custom:realUserId"]).toBe(TEST_USER_ID);
  });

  it("should set token_use to access", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as { token_use: string };

    expect(payload.token_use).toBe("access");
  });

  it("should have 1 hour expiry", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as {
      iat: number;
      exp: number;
    };

    expect(payload.exp - payload.iat).toBe(3600);
  });

  it("should have local-dev signature", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const [, , signature] = token.split(".");

    expect(signature).toBe("local-dev");
  });
});

describe("generateMockIdToken", () => {
  it("should include custom claims", () => {
    const claims = {
      email: TEST_EMAIL,
      phone_number: "+1234567890",
      given_name: "John",
      family_name: "Doe",
    };
    const token = generateMockIdToken(TEST_USER_ID, claims);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as typeof claims;

    expect(payload.email).toBe(TEST_EMAIL);
    expect(payload.phone_number).toBe("+1234567890");
    expect(payload.given_name).toBe("John");
    expect(payload.family_name).toBe("Doe");
  });

  it("should set token_use to id", () => {
    const token = generateMockIdToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as { token_use: string };

    expect(payload.token_use).toBe("id");
  });

  it("should have 1 hour expiry", () => {
    const token = generateMockIdToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as {
      iat: number;
      exp: number;
    };

    expect(payload.exp - payload.iat).toBe(3600);
  });
});

describe("generateMockRefreshToken", () => {
  it("should have 30 day expiry", () => {
    const token = generateMockRefreshToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as {
      iat: number;
      exp: number;
    };

    expect(payload.exp - payload.iat).toBe(30 * 24 * 3600);
  });

  it("should set token_use to refresh", () => {
    const token = generateMockRefreshToken(TEST_USER_ID);
    const [, payloadPart] = token.split(".");
    const payload = decodeBase64Url(payloadPart) as { token_use: string };

    expect(payload.token_use).toBe("refresh");
  });
});

describe("generateDeterministicUserId", () => {
  it("should return same ID for same identifier", () => {
    const id1 = generateDeterministicUserId(TEST_EMAIL);
    const id2 = generateDeterministicUserId(TEST_EMAIL);

    expect(id1).toBe(id2);
  });

  it("should return different IDs for different identifiers", () => {
    const id1 = generateDeterministicUserId("test1@example.com");
    const id2 = generateDeterministicUserId("test2@example.com");

    expect(id1).not.toBe(id2);
  });

  it("should return local-user prefixed ID", () => {
    const id = generateDeterministicUserId(TEST_EMAIL);

    expect(id).toMatch(/^local-user-[0-9a-f]+$/);
  });
});

describe("decodeMockToken", () => {
  it("should decode valid token", () => {
    const token = generateMockAccessToken(TEST_USER_ID);
    const payload = decodeMockToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.["custom:realUserId"]).toBe(TEST_USER_ID);
    expect(payload?.token_use).toBe("access");
  });

  it("should return null for malformed token", () => {
    const payload = decodeMockToken("not.a.valid");

    expect(payload).toBeNull();
  });

  it("should return null for token with wrong number of parts", () => {
    const payload = decodeMockToken("only.two");

    expect(payload).toBeNull();
  });

  it("should return null for token with invalid base64", () => {
    const payload = decodeMockToken("header.!!!invalid!!!.signature");

    expect(payload).toBeNull();
  });

  it("should return null for token missing required fields", () => {
    // Create a token without required fields
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
      "base64"
    );
    const invalidPayload = Buffer.from(JSON.stringify({ foo: "bar" })).toString(
      "base64"
    );
    const token = `${header}.${invalidPayload}.local-dev`;

    const payload = decodeMockToken(token);

    expect(payload).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("should return false for valid non-expired token", () => {
    const token = generateMockAccessToken(TEST_USER_ID);

    expect(isTokenExpired(token)).toBe(false);
  });

  it("should return true for expired token", () => {
    // Create an expired token by manually constructing one with past exp
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" })
    ).toString("base64");
    const now = Math.floor(Date.now() / 1000);
    const expiredPayload = Buffer.from(
      JSON.stringify({
        sub: "test-sub",
        iat: now - 7200,
        exp: now - 3600, // Expired 1 hour ago
        token_use: "access",
        "custom:realUserId": TEST_USER_ID,
      })
    ).toString("base64");
    const expiredToken = `${header}.${expiredPayload}.local-dev`;

    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it("should return true for invalid token", () => {
    expect(isTokenExpired("invalid.token.here")).toBe(true);
  });
});
