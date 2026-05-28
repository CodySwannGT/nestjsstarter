/**
 * @file rds-signer.test.ts
 * @description Unit tests for RDS IAM authentication token generation
 * @module database
 */

import { vi, expect } from "vitest";

const { mockGetAuthToken } = vi.hoisted(() => ({
  mockGetAuthToken: vi.fn(),
}));

vi.mock("@aws-sdk/rds-signer", () => ({
  Signer: vi.fn().mockImplementation(function () {
    return { getAuthToken: mockGetAuthToken };
  }),
}));

import { Signer } from "@aws-sdk/rds-signer";
import { generateRdsAuthToken } from "./rds-signer";

/**
 * Test constants to avoid duplicate string lint errors.
 */
const TEST_CONFIG = {
  DEFAULT_HOSTNAME: "host.rds.amazonaws.com",
  DEFAULT_PORT: 5432,
  DEFAULT_USERNAME: "user",
} as const;

describe("generateRdsAuthToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create Signer with correct parameters", async () => {
    const hostname = "test-db.cluster-123.us-east-1.rds.amazonaws.com";
    const port = 5432;
    const username = "db_user";
    mockGetAuthToken.mockResolvedValue("mock-token");

    await generateRdsAuthToken(hostname, port, username);

    expect(Signer).toHaveBeenCalledWith({
      hostname,
      port,
      username,
    });
  });

  it("should return auth token from signer", async () => {
    const expectedToken = "mock-auth-token-12345";
    mockGetAuthToken.mockResolvedValue(expectedToken);

    const result = await generateRdsAuthToken(
      "test-db.rds.amazonaws.com",
      5432,
      "user"
    );

    expect(result).toBe(expectedToken);
  });

  it("should pass hostname to Signer", async () => {
    const hostname = "custom-hostname.rds.amazonaws.com";
    mockGetAuthToken.mockResolvedValue("token");

    await generateRdsAuthToken(hostname, 5432, "user");

    expect(Signer).toHaveBeenCalledWith(expect.objectContaining({ hostname }));
  });

  it("should pass port to Signer", async () => {
    const port = 3306;
    mockGetAuthToken.mockResolvedValue("token");

    await generateRdsAuthToken(
      TEST_CONFIG.DEFAULT_HOSTNAME,
      port,
      TEST_CONFIG.DEFAULT_USERNAME
    );

    expect(Signer).toHaveBeenCalledWith(expect.objectContaining({ port }));
  });

  it("should pass username to Signer", async () => {
    const username = "custom_db_user";
    mockGetAuthToken.mockResolvedValue("token");

    await generateRdsAuthToken(
      TEST_CONFIG.DEFAULT_HOSTNAME,
      TEST_CONFIG.DEFAULT_PORT,
      username
    );

    expect(Signer).toHaveBeenCalledWith(expect.objectContaining({ username }));
  });

  it("should propagate Signer errors", async () => {
    const signerError = new Error("Credentials not found");
    mockGetAuthToken.mockRejectedValue(signerError);

    await expect(
      generateRdsAuthToken(
        TEST_CONFIG.DEFAULT_HOSTNAME,
        TEST_CONFIG.DEFAULT_PORT,
        TEST_CONFIG.DEFAULT_USERNAME
      )
    ).rejects.toThrow("Credentials not found");
  });
});
