/**
 * @file mock-jwt.util.ts
 * @description Utilities for generating mock JWT tokens for local development
 * @module auth/utils
 */

/**
 * Claims included in mock ID tokens
 * @description Optional user claims that can be included in ID tokens
 */
export interface IdTokenClaims {
  readonly email?: string;
  readonly phone_number?: string;
  readonly given_name?: string;
  readonly family_name?: string;
}

/**
 * Payload structure for mock tokens
 * @description Contains standard JWT claims plus custom user ID
 */
export interface MockTokenPayload {
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
  readonly token_use: "access" | "id" | "refresh";
  readonly "custom:realUserId": string;
  readonly [key: string]: unknown;
}

const MOCK_SIGNATURE = "local-dev";
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
const ID_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 3600; // 30 days

/**
 * Encodes object to base64url format
 * @param obj - Object to encode
 * @returns Base64url encoded string
 */
function base64UrlEncode(obj: object): string {
  const json = JSON.stringify(obj);
  const base64 = Buffer.from(json).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Creates JWT header for mock tokens
 * @returns Header object with alg: none
 */
function createHeader(): object {
  return { alg: "none", typ: "JWT" };
}

/**
 * Generates a deterministic user ID from identifier
 * @param identifier - Email or phone number
 * @returns Deterministic UUID-like string prefixed with local-user-
 */
export function generateDeterministicUserId(identifier: string): string {
  // Simple hash-based approach for deterministic IDs
  const hash = identifier.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const positive = Math.abs(hash);
  return `local-user-${positive.toString(16).padStart(8, "0")}`;
}

/**
 * Generates a mock access token for local development
 * @param userId - The user ID to include in the token
 * @returns JWT-formatted access token string with header.payload.signature structure
 */
export function generateMockAccessToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
    token_use: "access",
    "custom:realUserId": userId,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}

/**
 * Generates a mock ID token for local development
 * @param userId - The user ID to include in the token
 * @param claims - Optional additional claims (email, phone, name)
 * @returns JWT-formatted ID token string with header.payload.signature structure
 */
export function generateMockIdToken(
  userId: string,
  claims?: IdTokenClaims
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + ID_TOKEN_EXPIRY_SECONDS,
    token_use: "id",
    "custom:realUserId": userId,
    ...claims,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}

/**
 * Generates a mock refresh token for local development
 * @param userId - The user ID to include in the token
 * @returns JWT-formatted refresh token string with header.payload.signature structure
 */
export function generateMockRefreshToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
    token_use: "refresh",
    "custom:realUserId": userId,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}

/**
 * Decodes a mock JWT token without cryptographic verification
 * @param token - The JWT token string to decode
 * @returns The decoded payload or null if token is invalid
 * @remarks Only use this for local development tokens
 */
export function decodeMockToken(token: string): MockTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1];
    // Handle base64url encoding
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(json) as MockTokenPayload;

    // Validate required fields
    if (!payload.sub || !payload.exp || !payload.iat) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks if a mock JWT token has expired
 * @param token - The JWT token string to check
 * @returns true if token is expired or invalid, false if valid and not expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeMockToken(token);
  if (!payload) {
    return true; // Invalid tokens are considered expired
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
