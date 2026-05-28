/**
 * @file rds-signer.ts
 * @description Utility for generating AWS RDS IAM authentication tokens
 * @module database
 */
import { Signer } from "@aws-sdk/rds-signer";

/**
 * Generates a temporary IAM authentication token for RDS connections.
 * @description Uses AWS RDS Signer to generate a password token that can be used
 * for IAM database authentication instead of storing passwords in environment
 * variables.
 * @param hostname - The RDS endpoint hostname (e.g., "db.cluster-123.us-east-1.rds.amazonaws.com")
 * @param port - The database port (typically 5432 for PostgreSQL)
 * @param username - The database username configured for IAM authentication
 * @returns A temporary authentication token valid for 15 minutes
 * @throws Error if AWS credentials are not available or token generation fails
 * @remarks The generated token is valid for 15 minutes per AWS specification.
 * Callers should handle token expiration by regenerating tokens before they expire.
 * @example
 * ```typescript
 * const token = await generateRdsAuthToken(
 *   "mydb.cluster-xyz.us-east-1.rds.amazonaws.com",
 *   5432,
 *   "db_admin"
 * );
 * // Use token as password in database connection
 * ```
 */
export async function generateRdsAuthToken(
  hostname: string,
  port: number,
  username: string
): Promise<string> {
  const signer = new Signer({
    hostname,
    port,
    username,
  });

  return signer.getAuthToken();
}
