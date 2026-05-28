/**
 * @file auth-service.provider.ts
 * @description Provider factory for selecting auth service based on environment
 * @module auth
 */

import { ConfigService } from "@nestjs/config";

import { IAuthService } from "../interfaces/auth-service.interface";
import { AuthService } from "../services/auth.service";
import { LocalAuthService } from "../services/local-auth.service";

/**
 * Injection token for auth service
 * @description Use this token to inject the appropriate auth service
 */
export const AUTH_SERVICE = "AUTH_SERVICE";

/**
 * Factory provider for auth service
 * @description Selects LocalAuthService for local dev, AuthService for production
 */
export const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (
    configService: ConfigService,
    authService: AuthService,
    localAuthService: LocalAuthService
  ): IAuthService => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
