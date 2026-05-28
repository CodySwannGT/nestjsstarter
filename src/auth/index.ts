/**
 * @file index.ts
 * @description Public API for auth module
 * @module auth
 */

// Authorization decorators
export * from "./decorators/auth-public.decorator";
export * from "./decorators/auth-authed.decorator";
export * from "./decorators/auth-owner.decorator";
export * from "./decorators/auth-groups.decorator";
export * from "./decorators/field-auth.decorator";
export * from "./decorators/subscription-auth.decorator";
export * from "./auth.types";
export * from "./auth.transformer";

// Authentication exports
export { AUTH_SERVICE } from "./providers/auth-service.provider";
export type { IAuthService } from "./interfaces/auth-service.interface";
export { JwtAuthGuard } from "./guards/jwt-auth.guard";

// Types for consumers
export * from "./types/authentication-result.type";
export * from "./types/authentication-result-with-message.type";
export * from "./types/challenge-parameters-result.type";
export * from "./types/challenge-result.type";
export * from "./types/confirm-sign-in-result.type";
export * from "./types/message.type";
export * from "./types/sign-in-result.type";
export * from "./inputs";
