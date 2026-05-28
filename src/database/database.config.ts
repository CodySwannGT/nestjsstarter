/**
 * @file database.config.ts
 * @description Database configuration module with ConfigService integration
 * @module database
 * @remarks
 * This module provides TypeORM configuration factory functions:
 * - ConfigService-based functions for NestJS context
 * - Standalone functions for TypeORM CLI (migrations)
 *
 * Configuration uses SnakeNamingStrategy for consistent column naming
 * and TypeOrmXRayLogger for distributed tracing.
 */
import { ConfigService } from "@nestjs/config";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { DataSourceOptions, LoggerOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { Configuration, configuration } from "../config/configuration";
import * as entities from "./entities";
import { generateRdsAuthToken } from "./rds-signer";
import { TypeOrmXRayLogger } from "./typeorm-xray-logger";

/** Default database host for local development */
const DEFAULT_DATABASE_HOST = "localhost";

/** Default SSL setting (disabled for local development) */
const DEFAULT_DATABASE_SSL = false;

/**
 * SSL configuration type for database connections
 * @description Either a boolean false or an object with rejectUnauthorized setting
 */
type DatabaseSslConfig = false | { readonly rejectUnauthorized: boolean };

/**
 * Parses SSL configuration from ConfigService.
 * @param configService - NestJS ConfigService instance
 * @returns SSL configuration object or false
 */
function parseSslConfigFromService(
  configService: ConfigService<Configuration, true>
): DatabaseSslConfig {
  if (!configService.get("database.ssl", { infer: true })) {
    return DEFAULT_DATABASE_SSL;
  }
  return {
    rejectUnauthorized: configService.get("database.sslRejectUnauthorized", {
      infer: true,
    }),
  };
}

/**
 * Default logging configuration for TypeORM.
 */
const DEFAULT_LOGGING_OPTIONS: LoggerOptions = ["error", "warn", "migration"];

/**
 * Builds the replication options object for TypeORM from resolved connection params.
 * @param masterHost - Primary database host
 * @param readHost - Read replica host
 * @param port - Database port
 * @param username - Database username
 * @param database - Database name
 * @param masterToken - IAM auth token for primary
 * @param readToken - IAM auth token for replica
 * @returns Replication configuration for TypeORM
 */
function buildReplicationOptions(
  masterHost: string,
  readHost: string,
  port: number,
  username: string,
  database: string,
  masterToken: string,
  readToken: string
) {
  return {
    master: {
      host: masterHost,
      port,
      username,
      password: masterToken,
      database,
    },
    slaves: [{ host: readHost, port, username, password: readToken, database }],
  };
}

/**
 * Parses SSL configuration from the standalone Configuration object.
 * @param config - Application configuration
 * @returns SSL configuration object or false
 */
function parseSslConfig(config: Configuration): DatabaseSslConfig {
  if (!config.database.ssl) {
    return DEFAULT_DATABASE_SSL;
  }
  return { rejectUnauthorized: config.database.sslRejectUnauthorized };
}

/**
 * Determines if the application is running in a local environment.
 * @param configService - NestJS ConfigService instance
 * @returns True if running locally or in tests, false for production
 */
function isLocalEnvironmentFromService(
  configService: ConfigService<Configuration, true>
): boolean {
  const isOffline = configService.get("app.isOffline", { infer: true });
  const isTest = configService.get("app.nodeEnv", { infer: true }) === "test";

  return isOffline || isTest;
}

/**
 * Creates the base TypeORM configuration shared by all environments.
 * @description Returns configuration with:
 * - SnakeNamingStrategy for consistent snake_case column names
 * - TypeOrmXRayLogger for distributed tracing
 * - Explicit entity exports for esbuild compatibility
 * @returns Partial DataSourceOptions with shared configuration
 */
function createBaseConfig(): Partial<DataSourceOptions> & {
  type: "postgres";
} {
  return {
    type: "postgres",
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    logger: new TypeOrmXRayLogger(),
    logging: DEFAULT_LOGGING_OPTIONS,
    entities: Object.values(entities),
  };
}

/**
 * Creates TypeORM configuration for local development using ConfigService.
 * @param configService - NestJS ConfigService instance
 * @returns Complete DataSourceOptions for local environment
 */
function createLocalConfigFromService(
  configService: ConfigService<Configuration, true>
): DataSourceOptions {
  const baseConfig = createBaseConfig();
  const host = configService.get("database.host", { infer: true });
  const port = configService.get("database.port", { infer: true });
  const username = configService.get("database.username", { infer: true });
  const password = configService.get("database.password", { infer: true });
  const database = configService.get("database.name", { infer: true });

  return {
    ...baseConfig,
    host,
    port,
    username,
    password,
    database,
    ssl: DEFAULT_DATABASE_SSL,
  };
}

/**
 * Creates TypeORM configuration for production with replication using ConfigService.
 * @param configService - NestJS ConfigService instance
 * @returns Promise resolving to DataSourceOptions with replication
 * @remarks IAM tokens are generated at initialization. Lambda functions
 * typically have short lifespans, so token expiration is not a concern.
 */
async function createProductionConfigFromService(
  configService: ConfigService<Configuration, true>
): Promise<DataSourceOptions> {
  const baseConfig = createBaseConfig();
  const masterHost =
    configService.get("database.proxyHost", { infer: true }) ??
    DEFAULT_DATABASE_HOST;
  const readHost =
    configService.get("database.proxyHostRead", { infer: true }) ?? masterHost;
  const port = configService.get("database.port", { infer: true });
  const username = configService.get("database.username", { infer: true });
  const database = configService.get("database.name", { infer: true });
  const ssl = parseSslConfigFromService(configService);

  const masterToken = await generateRdsAuthToken(masterHost, port, username);
  const readToken = await generateRdsAuthToken(readHost, port, username);

  return {
    ...baseConfig,
    ssl,
    replication: buildReplicationOptions(
      masterHost,
      readHost,
      port,
      username,
      database,
      masterToken,
      readToken
    ),
  };
}

/**
 * Creates TypeORM module options for NestJS integration using ConfigService.
 * @param configService - NestJS ConfigService instance
 * @returns Promise resolving to TypeOrmModuleOptions
 */
export async function createTypeOrmOptionsFromConfigService(
  configService: ConfigService<Configuration, true>
): Promise<TypeOrmModuleOptions> {
  const config = isLocalEnvironmentFromService(configService)
    ? createLocalConfigFromService(configService)
    : await createProductionConfigFromService(configService);

  return {
    ...config,
    autoLoadEntities: false,
  };
}

// =============================================================================
// Standalone functions for TypeORM CLI (migrations)
// These functions use configuration() for environments without ConfigService
// =============================================================================

/**
 * Determines if the application is running in a local environment.
 * @description Checks for local development by examining IS_OFFLINE flag
 * (set by serverless-offline) or test environment.
 * @returns True if running locally or in tests, false for production
 * @remarks Used by TypeORM CLI and other contexts without ConfigService
 */
export function isLocalEnvironment(): boolean {
  const config = configuration();
  return config.app.isOffline || config.app.nodeEnv === "test";
}

/**
 * Creates TypeORM configuration for local development (standalone).
 * @description Uses environment variables directly for TypeORM CLI compatibility
 * @returns Complete DataSourceOptions for local environment
 * @remarks Used by TypeORM CLI (typeorm.config.ts) for migrations
 */
export function createLocalConfig(): DataSourceOptions {
  const baseConfig = createBaseConfig();
  const config = configuration();

  return {
    ...baseConfig,
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name,
    ssl: DEFAULT_DATABASE_SSL,
  };
}

/**
 * Creates TypeORM configuration for production with replication (standalone).
 * @description Uses environment variables directly for contexts without ConfigService
 * @returns Promise resolving to DataSourceOptions with replication
 * @remarks For NestJS context, prefer createTypeOrmOptionsFromConfigService
 */
export async function createProductionConfig(): Promise<DataSourceOptions> {
  const baseConfig = createBaseConfig();
  const config = configuration();
  const masterHost = config.database.proxyHost ?? DEFAULT_DATABASE_HOST;
  const readHost = config.database.proxyHostRead ?? masterHost;
  const port = config.database.port;
  const username = config.database.username;
  const database = config.database.name;
  const ssl = parseSslConfig(config);

  const masterToken = await generateRdsAuthToken(masterHost, port, username);
  const readToken = await generateRdsAuthToken(readHost, port, username);

  return {
    ...baseConfig,
    ssl,
    replication: buildReplicationOptions(
      masterHost,
      readHost,
      port,
      username,
      database,
      masterToken,
      readToken
    ),
  };
}

/**
 * Creates TypeORM module options for NestJS integration (standalone).
 * @description Factory function for TypeOrmModule.forRootAsync() - standalone version
 * @returns Promise resolving to TypeOrmModuleOptions
 * @remarks For NestJS context with ConfigService, prefer createTypeOrmOptionsFromConfigService
 * @deprecated Use createTypeOrmOptionsFromConfigService with ConfigService injection instead
 */
export async function createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
  const config = isLocalEnvironment()
    ? createLocalConfig()
    : await createProductionConfig();

  return {
    ...config,
    autoLoadEntities: false,
  };
}
