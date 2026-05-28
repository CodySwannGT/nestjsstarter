/**
 * @file jwt-auth.guard.ts
 * @description NestJS guard for JWT token validation
 * @module auth/guards
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GqlExecutionContext } from "@nestjs/graphql";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request } from "express";
import { decodeMockToken, isTokenExpired } from "../utils/mock-jwt.util";

/**
 * User data extracted from JWT
 * @description Contains user identification and group memberships
 */
interface JwtUser {
  readonly id: string;
  readonly sub: string;
  readonly groups?: readonly string[];
}

/**
 * Guard for validating JWT tokens on HTTP requests
 * @description Validates local mock tokens or Cognito tokens based on environment.
 * In production mode, validates Cognito configuration at startup to fail fast.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null =
    null;

  /**
   * Creates a JwtAuthGuard instance
   * @param configService - Configuration service for environment settings
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates Cognito configuration on module initialization
   * @description Fails fast in production if required Cognito config is missing
   */
  onModuleInit(): void {
    const isOffline = this.configService.get<string>("IS_OFFLINE") === "true";

    if (isOffline) {
      this.logger.log("Running in offline mode - using local token validation");
      return;
    }

    // Validate Cognito config at startup in production
    const userPoolId = this.configService.get<string>("COGNITO_USER_POOL_ID");
    const clientId = this.configService.get<string>("COGNITO_CLIENT_ID");

    if (!userPoolId || !clientId) {
      throw new Error(
        "Missing required Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set in production mode"
      );
    }

    this.logger.log("Cognito configuration validated successfully");
  }

  /**
   * Determines if request can proceed based on JWT validation
   * @param context - Execution context
   * @returns true if token is valid, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req as Request & { user?: JwtUser };

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);
    const isOffline = this.configService.get<string>("IS_OFFLINE") === "true";

    if (isOffline) {
      return this.validateLocalToken(token, request);
    }

    return this.validateCognitoToken(token, request);
  }

  /**
   * Validates mock JWT token for local development
   * @param token - JWT token string
   * @param request - Express request to attach user
   * @returns true if token is valid
   */
  private validateLocalToken(
    token: string,
    request: Request & { user?: JwtUser }
  ): boolean {
    const payload = decodeMockToken(token);
    if (!payload) {
      return false;
    }

    if (isTokenExpired(token)) {
      return false;
    }

    request.user = {
      id: (payload["custom:realUserId"] as string) || payload.sub,
      sub: payload.sub,
    };

    return true;
  }

  /**
   * Validates Cognito JWT token for production
   * @param token - JWT token string
   * @param request - Express request to attach user
   * @returns true if token is valid
   * @throws Error if Cognito configuration is missing
   */
  private async validateCognitoToken(
    token: string,
    request: Request & { user?: JwtUser }
  ): Promise<boolean> {
    // Get verifier first - this throws if config is missing
    const verifier = this.getCognitoVerifier();

    try {
      const payload = await verifier.verify(token);

      request.user = {
        id: (payload["custom:realUserId"] as string) || payload.sub,
        sub: payload.sub,
        groups: payload["cognito:groups"] as readonly string[] | undefined,
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets or creates Cognito JWT verifier
   * @returns Configured Cognito verifier
   * @throws Error if required Cognito configuration is missing
   */
  private getCognitoVerifier() {
    if (!this.cognitoVerifier) {
      const userPoolId = this.configService.get<string>("COGNITO_USER_POOL_ID");
      const clientId = this.configService.get<string>("COGNITO_CLIENT_ID");

      if (!userPoolId || !clientId) {
        throw new Error(
          "Missing required Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set"
        );
      }

      this.cognitoVerifier = CognitoJwtVerifier.create({
        userPoolId,
        clientId,
        tokenUse: "access",
      });
    }
    return this.cognitoVerifier;
  }
}
