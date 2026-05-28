/**
 * @file auth-service.provider.test.ts
 * @description Unit tests for auth service provider factory
 * @module auth
 */

import { vi, expect, type Mock } from "vitest";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "../services/auth.service";
import { LocalAuthService } from "../services/local-auth.service";
import { AUTH_SERVICE, authServiceProvider } from "./auth-service.provider";

describe("AUTH_SERVICE", () => {
  it("should be defined as string constant", () => {
    expect(AUTH_SERVICE).toBeDefined();
    expect(typeof AUTH_SERVICE).toBe("string");
    expect(AUTH_SERVICE).toBe("AUTH_SERVICE");
  });
});

describe("authServiceProvider", () => {
  it("should provide AUTH_SERVICE token", () => {
    expect(authServiceProvider).toBeDefined();
    expect(authServiceProvider.provide).toBe(AUTH_SERVICE);
  });

  it("should inject ConfigService, AuthService, and LocalAuthService", () => {
    expect(authServiceProvider.inject).toBeDefined();
    expect(authServiceProvider.inject).toHaveLength(3);
    expect(authServiceProvider.inject).toContain(ConfigService);
    expect(authServiceProvider.inject).toContain(AuthService);
    expect(authServiceProvider.inject).toContain(LocalAuthService);
  });

  describe("useFactory", () => {
    const mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    const mockAuthService = {
      signIn: vi.fn(),
    } as unknown as AuthService;

    const mockLocalAuthService = {
      signIn: vi.fn(),
    } as unknown as LocalAuthService;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return LocalAuthService when IS_OFFLINE="true"', () => {
      (mockConfigService.get as Mock).mockReturnValue("true");

      const result = authServiceProvider.useFactory(
        mockConfigService,
        mockAuthService,
        mockLocalAuthService
      );

      expect(mockConfigService.get).toHaveBeenCalledWith("IS_OFFLINE");
      expect(result).toBe(mockLocalAuthService);
    });

    it('should return AuthService when IS_OFFLINE is not "true"', () => {
      (mockConfigService.get as Mock).mockReturnValue("false");

      const result = authServiceProvider.useFactory(
        mockConfigService,
        mockAuthService,
        mockLocalAuthService
      );

      expect(mockConfigService.get).toHaveBeenCalledWith("IS_OFFLINE");
      expect(result).toBe(mockAuthService);
    });

    it("should return AuthService when IS_OFFLINE is undefined", () => {
      (mockConfigService.get as Mock).mockReturnValue(undefined);

      const result = authServiceProvider.useFactory(
        mockConfigService,
        mockAuthService,
        mockLocalAuthService
      );

      expect(mockConfigService.get).toHaveBeenCalledWith("IS_OFFLINE");
      expect(result).toBe(mockAuthService);
    });
  });
});
