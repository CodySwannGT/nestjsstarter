/**
 * @file database.config.test.ts
 * @description Unit tests for database configuration module
 * @module database
 */

import { vi, expect, type Mock } from "vitest";

const { mockGenerateRdsAuthToken } = vi.hoisted(() => ({
  mockGenerateRdsAuthToken: vi.fn(),
}));

vi.mock("./rds-signer", () => ({
  generateRdsAuthToken: mockGenerateRdsAuthToken,
}));

import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import type { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import {
  isLocalEnvironment,
  createLocalConfig,
  createProductionConfig,
  createTypeOrmOptionsFromConfigService,
  createTypeOrmOptions,
} from "./database.config";
import { TypeOrmXRayLogger } from "./typeorm-xray-logger";

/**
 * Test constants to avoid duplicate string lint errors.
 */
const TEST_CONFIG = {
  CUSTOM_HOST: "custom-host.db.example.com",
  CUSTOM_PORT: "5433",
  CUSTOM_USER: "custom-user",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Test value, not a real credential
  CUSTOM_PASSWORD: "custom-password",
  CUSTOM_DATABASE: "custom-db",
  PROXY_HOST: "proxy.rds.amazonaws.com",
  PROXY_READ_HOST: "read-proxy.rds.amazonaws.com",
  DEFAULT_HOST: "localhost",
  DEFAULT_PORT: 5432,
  DEFAULT_USER: "thumbwar",
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Test value, not a real credential
  DEFAULT_PASSWORD: "thumbwar_local",
  DEFAULT_DATABASE: "thumbwar",
  MOCK_TOKEN: "mock-rds-token",
} as const;

describe("isLocalEnvironment", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.IS_OFFLINE;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true when IS_OFFLINE is true", () => {
    process.env.IS_OFFLINE = "true";

    expect(isLocalEnvironment()).toBe(true);
  });

  it("should return true when NODE_ENV is test", () => {
    process.env.NODE_ENV = "test";

    expect(isLocalEnvironment()).toBe(true);
  });

  it("should return false in production", () => {
    process.env.NODE_ENV = "production";
    process.env.IS_OFFLINE = "false";

    expect(isLocalEnvironment()).toBe(false);
  });

  it("should return false when IS_OFFLINE is undefined and NODE_ENV is not test", () => {
    process.env.NODE_ENV = "development";

    expect(isLocalEnvironment()).toBe(false);
  });
});

describe("createLocalConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_NAME;
    delete process.env.DATABASE_SSL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use environment variables", () => {
    process.env.DATABASE_HOST = TEST_CONFIG.CUSTOM_HOST;
    process.env.DATABASE_PORT = TEST_CONFIG.CUSTOM_PORT;
    process.env.DATABASE_USER = TEST_CONFIG.CUSTOM_USER;

    process.env.DATABASE_PASSWORD = TEST_CONFIG.CUSTOM_PASSWORD;
    process.env.DATABASE_NAME = TEST_CONFIG.CUSTOM_DATABASE;

    const config = createLocalConfig() as PostgresConnectionOptions;

    expect(config.host).toBe(TEST_CONFIG.CUSTOM_HOST);
    expect(config.port).toBe(parseInt(TEST_CONFIG.CUSTOM_PORT, 10));
    expect(config.username).toBe(TEST_CONFIG.CUSTOM_USER);
    expect(config.password).toBe(TEST_CONFIG.CUSTOM_PASSWORD);
    expect(config.database).toBe(TEST_CONFIG.CUSTOM_DATABASE);
  });

  it("should use default values when env vars missing", () => {
    const config = createLocalConfig() as PostgresConnectionOptions;

    expect(config.host).toBe(TEST_CONFIG.DEFAULT_HOST);
    expect(config.port).toBe(TEST_CONFIG.DEFAULT_PORT);
    expect(config.username).toBe(TEST_CONFIG.DEFAULT_USER);
    expect(config.password).toBe(TEST_CONFIG.DEFAULT_PASSWORD);
    expect(config.database).toBe(TEST_CONFIG.DEFAULT_DATABASE);
  });

  it("should include base config properties", () => {
    const config = createLocalConfig();

    expect(config.namingStrategy).toBeInstanceOf(SnakeNamingStrategy);
    expect(config.logger).toBeInstanceOf(TypeOrmXRayLogger);
    expect(config.type).toBe("postgres");
  });

  it("should set ssl to false by default", () => {
    const config = createLocalConfig() as PostgresConnectionOptions;

    expect(config.ssl).toBe(false);
  });
});

describe("createProductionConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.DATABASE_PROXY_HOST = TEST_CONFIG.PROXY_HOST;
    process.env.DATABASE_PROXY_HOST_READ_1 = TEST_CONFIG.PROXY_READ_HOST;
    process.env.DATABASE_USER = TEST_CONFIG.CUSTOM_USER;
    process.env.DATABASE_PORT = TEST_CONFIG.CUSTOM_PORT;
    process.env.DATABASE_NAME = TEST_CONFIG.CUSTOM_DATABASE;
    delete process.env.DATABASE_SSL;
    delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    mockGenerateRdsAuthToken.mockResolvedValue(TEST_CONFIG.MOCK_TOKEN);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should configure replication with correct master and slave hosts", async () => {
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    expect(config.replication).toBeDefined();
    expect(config.replication?.master?.host).toBe(TEST_CONFIG.PROXY_HOST);
    expect(config.replication?.slaves).toHaveLength(1);
    expect(config.replication?.slaves?.[0]?.host).toBe(
      TEST_CONFIG.PROXY_READ_HOST
    );
  });

  it("should use RDS Signer for password generation", async () => {
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    const masterPassword = config.replication?.master?.password;
    const slavePassword = config.replication?.slaves?.[0]?.password;

    // Passwords should be resolved strings from generateRdsAuthToken
    expect(typeof masterPassword).toBe("string");
    expect(typeof slavePassword).toBe("string");
    expect(masterPassword).toBe(TEST_CONFIG.MOCK_TOKEN);
    expect(slavePassword).toBe(TEST_CONFIG.MOCK_TOKEN);

    // Verify generateRdsAuthToken was called for both master and slave
    expect(mockGenerateRdsAuthToken).toHaveBeenCalledTimes(2);
  });

  it("should include base config properties", async () => {
    const config = await createProductionConfig();

    expect(config.namingStrategy).toBeInstanceOf(SnakeNamingStrategy);
    expect(config.logger).toBeInstanceOf(TypeOrmXRayLogger);
    expect(config.type).toBe("postgres");
  });

  it("should set ssl to false when DATABASE_SSL is not set", async () => {
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    expect(config.ssl).toBe(false);
  });

  it("should configure ssl object when DATABASE_SSL=true", async () => {
    process.env.DATABASE_SSL = "true";
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("should configure ssl with rejectUnauthorized false when DATABASE_SSL=true and DATABASE_SSL_REJECT_UNAUTHORIZED=false", async () => {
    process.env.DATABASE_SSL = "true";
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("should fall back to localhost when DATABASE_PROXY_HOST is not set", async () => {
    delete process.env.DATABASE_PROXY_HOST;
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    expect(config.replication?.master?.host).toBe("localhost");
  });

  it("should fall back to masterHost when DATABASE_PROXY_HOST_READ_1 is not set", async () => {
    delete process.env.DATABASE_PROXY_HOST_READ_1;
    const config =
      (await createProductionConfig()) as PostgresConnectionOptions;

    // readHost falls back to masterHost when read replica not configured
    expect(config.replication?.slaves?.[0]?.host).toBe(TEST_CONFIG.PROXY_HOST);
  });
});

describe("createTypeOrmOptionsFromConfigService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRdsAuthToken.mockResolvedValue(TEST_CONFIG.MOCK_TOKEN);
  });

  /**
   * Creates a mock ConfigService for testing
   * @param overrides - Configuration values to override defaults
   * @returns Mock ConfigService with get method
   */
  const createMockConfigService = (
    overrides: Record<string, unknown> = {}
  ): { get: Mock } => {
    const defaults: Record<string, unknown> = {
      "app.isOffline": false,
      "app.nodeEnv": "production",
      "database.host": TEST_CONFIG.DEFAULT_HOST,
      "database.port": TEST_CONFIG.DEFAULT_PORT,
      "database.username": TEST_CONFIG.DEFAULT_USER,
      "database.password": TEST_CONFIG.DEFAULT_PASSWORD,
      "database.name": TEST_CONFIG.DEFAULT_DATABASE,
      "database.ssl": false,
      "database.sslRejectUnauthorized": false,
      "database.proxyHost": null,
      "database.proxyHostRead": null,
    };

    const config = { ...defaults, ...overrides };

    return {
      get: vi.fn((key: string) => config[key]),
    };
  };

  it("should return local config when IS_OFFLINE", async () => {
    const mockConfigService = createMockConfigService({
      "app.isOffline": true,
      "database.host": TEST_CONFIG.DEFAULT_HOST,
      "database.port": TEST_CONFIG.DEFAULT_PORT,
      "database.username": TEST_CONFIG.DEFAULT_USER,
      "database.password": TEST_CONFIG.DEFAULT_PASSWORD,
      "database.name": TEST_CONFIG.DEFAULT_DATABASE,
    });

    const config = (await createTypeOrmOptionsFromConfigService(
      mockConfigService as never
    )) as unknown as PostgresConnectionOptions;

    // Local config has direct host, not replication
    expect(config.host).toBe(TEST_CONFIG.DEFAULT_HOST);
    expect(config.replication).toBeUndefined();
  });

  it("should return local config when nodeEnv is test", async () => {
    const mockConfigService = createMockConfigService({
      "app.isOffline": false,
      "app.nodeEnv": "test",
      "database.host": TEST_CONFIG.DEFAULT_HOST,
      "database.port": TEST_CONFIG.DEFAULT_PORT,
      "database.username": TEST_CONFIG.DEFAULT_USER,
      "database.password": TEST_CONFIG.DEFAULT_PASSWORD,
      "database.name": TEST_CONFIG.DEFAULT_DATABASE,
    });

    const config = (await createTypeOrmOptionsFromConfigService(
      mockConfigService as never
    )) as unknown as PostgresConnectionOptions;

    // Test environment uses local config just like offline mode
    expect(config.host).toBe(TEST_CONFIG.DEFAULT_HOST);
    expect(config.replication).toBeUndefined();
  });

  it("should return production config in production", async () => {
    const mockConfigService = createMockConfigService({
      "app.isOffline": false,
      "app.nodeEnv": "production",
      "database.proxyHost": TEST_CONFIG.PROXY_HOST,
      "database.proxyHostRead": TEST_CONFIG.PROXY_READ_HOST,
      "database.port": parseInt(TEST_CONFIG.CUSTOM_PORT, 10),
      "database.username": TEST_CONFIG.CUSTOM_USER,
      "database.name": TEST_CONFIG.CUSTOM_DATABASE,
      "database.ssl": true,
      "database.sslRejectUnauthorized": false,
    });

    const config = (await createTypeOrmOptionsFromConfigService(
      mockConfigService as never
    )) as unknown as PostgresConnectionOptions;

    // Production config has replication
    expect(config.replication).toBeDefined();
  });

  it("should set autoLoadEntities to false", async () => {
    const mockConfigService = createMockConfigService({
      "app.isOffline": true,
    });

    const config = await createTypeOrmOptionsFromConfigService(
      mockConfigService as never
    );

    expect(config.autoLoadEntities).toBe(false);
  });
});

describe("createTypeOrmOptions", () => {
  it("should return local config and set autoLoadEntities to false", async () => {
    // In test environment (NODE_ENV=test), isLocalEnvironment() always returns true,
    // so createTypeOrmOptions() will always use createLocalConfig()
    const config =
      (await createTypeOrmOptions()) as unknown as PostgresConnectionOptions & {
        autoLoadEntities: boolean;
      };

    expect(config.autoLoadEntities).toBe(false);
    // Local config has direct host, not replication
    expect(config.replication).toBeUndefined();
  });
});
