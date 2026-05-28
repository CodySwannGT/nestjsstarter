/**
 * @file ws-authorizer.handler.ts
 * @description Custom Lambda authorizer for WebSocket connections
 * @module websocket/authorizer
 * @remarks
 * This handler runs outside NestJS context, so it uses configuration()
 * for type-safe configuration access instead of ConfigService.
 */

import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerHandler,
} from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { configuration } from "../../config/configuration";

/**
 * JWT payload structure for Cognito tokens
 */
interface JwtPayload {
  sub: string;
  email?: string;
  "cognito:groups"?: readonly string[];
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | readonly string[];
  token_use?: string;
}

/** Cached Cognito JWT verifier instance (mutable singleton) */
// eslint-disable-next-line functional/no-let -- singleton pattern requires mutable cache
let cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

/**
 * Gets or creates the Cognito JWT verifier
 * @returns Cognito JWT verifier instance
 */
const getCognitoVerifier = (): ReturnType<typeof CognitoJwtVerifier.create> => {
  if (!cognitoVerifier) {
    const config = configuration();
    const userPoolId = config.cognito.userPoolId;
    const clientId = config.cognito.clientId;

    if (!userPoolId || !clientId) {
      throw new Error(
        "Missing COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID environment variables"
      );
    }

    cognitoVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: "access",
      clientId,
    });
  }

  return cognitoVerifier;
};

/**
 * Decodes a JWT token without verification (for development only)
 * @param token - The JWT token string
 * @returns The decoded payload
 * @remarks Uses base64url decoding per RFC 7519
 */
const decodeJwtUnsafe = (token: string): JwtPayload => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  // Convert base64url to base64 (replace - with +, _ with /)
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(payload) as JwtPayload;
};

/**
 * Validates a JWT token with full cryptographic verification
 * @param token - The JWT token to validate
 * @returns The decoded and validated payload
 * @remarks
 * - Uses aws-jwt-verify for production Cognito token validation
 * - Falls back to decode-only mode in development (IS_OFFLINE=true)
 */
const validateJwt = async (token: string): Promise<JwtPayload> => {
  const config = configuration();

  // In offline/development mode, skip signature verification
  if (config.app.isOffline) {
    console.warn(
      "Running in offline mode - JWT signature verification skipped"
    );
    const payload = decodeJwtUnsafe(token);

    // Still check expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error("Token expired");
      }
    }

    return payload;
  }

  // Production: Full cryptographic verification
  const verifier = getCognitoVerifier();
  const verified = await verifier.verify(token);

  return {
    sub: verified.sub,
    email: verified.email as string | undefined,
    "cognito:groups": verified["cognito:groups"] as
      | readonly string[]
      | undefined,
    exp: verified.exp,
    iat: verified.iat,
    iss: verified.iss,
    aud: verified.aud as string | undefined,
    token_use: verified.token_use,
  };
};

/**
 * Generates an IAM policy for the authorizer response
 * @param effect - Allow or Deny
 * @param resource - The API Gateway resource ARN
 * @returns IAM policy document
 */
const generatePolicy = (
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult["policyDocument"] => ({
  Version: "2012-10-17",
  Statement: [
    {
      Action: "execute-api:Invoke",
      Effect: effect,
      Resource: resource,
    },
  ],
});

/**
 * Builds an Allow policy result with user context from a validated JWT payload
 * @param payload - Decoded and verified JWT payload
 * @param methodArn - API Gateway method ARN for the policy resource
 * @returns IAM policy result granting access with user context
 */
const buildAllowResult = (
  payload: JwtPayload,
  methodArn: string
): APIGatewayAuthorizerResult => {
  const userId = payload.sub;
  const groups = payload["cognito:groups"] ?? [];

  console.log("Token validated successfully:", {
    userId,
    groupCount: groups.length,
  });

  return {
    principalId: userId,
    policyDocument: generatePolicy("Allow", methodArn),
    context: {
      userId,
      groups: JSON.stringify(groups),
      email: payload.email ?? "",
    },
  };
};

/**
 * Resolves the authorization result for a WebSocket connection attempt
 * @param token - JWT token from query string, or undefined if absent
 * @param methodArn - API Gateway method ARN used to scope the IAM policy
 * @returns Allow policy with user context on success, Deny policy otherwise
 * @remarks
 * - Returns Deny immediately when no token is present
 * - Catches validation errors and returns Deny to prevent exposing error details
 */
const resolveAuthResult = async (
  token: string | undefined,
  methodArn: string
): Promise<APIGatewayAuthorizerResult> => {
  console.log("WebSocket authorize request received");

  if (!token) {
    console.log("No token provided, denying connection");
    return {
      principalId: "anonymous",
      policyDocument: generatePolicy("Deny", methodArn),
    };
  }

  try {
    const payload = await validateJwt(token);
    return buildAllowResult(payload, methodArn);
  } catch (error) {
    console.error("Token validation failed:", error);
    return {
      principalId: "anonymous",
      policyDocument: generatePolicy("Deny", methodArn),
    };
  }
};

/**
 * Authorizes WebSocket connections using JWT tokens
 * @param event - API Gateway authorizer event with query string parameters
 * @returns IAM policy document with Allow/Deny and user context
 * @remarks
 * - Token is passed via query string: wss://...?token=JWT
 * - Returns Allow policy with user context on success
 * - Returns Deny policy on failure
 * - User context (userId, groups) is available in $connect handler via authorizer
 * - Uses aws-jwt-verify for cryptographic signature verification in production
 */
export const wsAuthorizer: APIGatewayRequestAuthorizerHandler = async event => {
  const routeKey = event.requestContext.routeKey ?? "$connect";
  const token = event.queryStringParameters?.token;

  return withXRaySubsegment(
    "WebSocket:Authorize",
    async () => resolveAuthResult(token, event.methodArn),
    { annotations: { route: routeKey } }
  );
};
