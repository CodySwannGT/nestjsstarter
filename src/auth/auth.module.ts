/**
 * @file auth.module.ts
 * @description NestJS module for authentication and authorization
 * @module auth
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthResolver } from "./auth.resolver";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import {
  AUTH_SERVICE,
  authServiceProvider,
} from "./providers/auth-service.provider";
import { AuthService } from "./services/auth.service";
import { CognitoService } from "./services/cognito.service";
import { LocalAuthService } from "./services/local-auth.service";

/**
 * Module providing authentication and authorization functionality
 * @description Provides auth services, resolver, and guards for the application
 * @remarks
 * - Uses ConfigModule for environment-based service selection
 * - Exports AUTH_SERVICE for use by other modules
 * - Exports JwtAuthGuard for protecting routes
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core services
    CognitoService,
    AuthService,
    LocalAuthService,

    // Provider factory for environment-based selection
    authServiceProvider,

    // GraphQL resolver
    AuthResolver,

    // Guards
    JwtAuthGuard,
  ],
  exports: [AUTH_SERVICE, JwtAuthGuard],
})
export class AuthModule {}
