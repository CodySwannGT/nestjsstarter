/**
 * @file configuration.ts
 * @description Main configuration factory for NestJS ConfigModule
 * @module config
 * @remarks
 * This module provides type-safe configuration loading from environment
 * variables. All configuration is centralized here and accessed via
 * ConfigService throughout the application.
 *
 * Configuration is organized into namespaces:
 * - app: Application-level settings (environment, offline mode)
 * - database: PostgreSQL/TypeORM settings
 * - valkey: Valkey/Redis cache settings
 * - cognito: AWS Cognito authentication settings
 * - graphql: GraphQL server settings
 * - websocket: WebSocket API Gateway settings
 */

/** Default database host for local development */
const DEFAULT_DATABASE_HOST = "localhost";

/** Default database port for PostgreSQL */
const DEFAULT_DATABASE_PORT = 5432;

/** Default database username for local development */
const DEFAULT_DATABASE_USER = "your-project";

/** Default database password for local development */
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Local development default, not a real credential
const DEFAULT_DATABASE_PASSWORD = "your-project_local";

/** Default database name */
const DEFAULT_DATABASE_NAME = "your-project";

/** Default Valkey host */
const DEFAULT_VALKEY_HOST = "localhost";

/** Default Valkey port */
const DEFAULT_VALKEY_PORT = 6379;

/**
 * Application configuration namespace
 */
interface AppConfig {
  /** Node environment (development, test, production) */
  readonly nodeEnv: string;
  /** Whether running in serverless-offline mode */
  readonly isOffline: boolean;
}

/**
 * Database configuration namespace
 */
interface DatabaseConfig {
  /** Database host */
  readonly host: string;
  /** Database port */
  readonly port: number;
  /** Database username */
  readonly username: string;
  /** Database password */
  readonly password: string;
  /** Database name */
  readonly name: string;
  /** Enable SSL */
  readonly ssl: boolean;
  /** Reject unauthorized SSL certificates */
  readonly sslRejectUnauthorized: boolean;
  /** RDS Proxy host for production writes */
  readonly proxyHost: string | undefined;
  /** RDS Proxy read replica host */
  readonly proxyHostRead: string | undefined;
}

/**
 * Valkey (Redis) configuration namespace
 */
interface ValkeyConfig {
  /** Valkey server host */
  readonly host: string;
  /** Valkey server port */
  readonly port: number;
  /** Maximum retries per request */
  readonly maxRetriesPerRequest: number;
}

/**
 * Cognito authentication configuration namespace
 */
interface CognitoConfig {
  /** Cognito User Pool ID */
  readonly userPoolId: string | undefined;
  /** Cognito Client ID */
  readonly clientId: string | undefined;
}

/**
 * GraphQL server configuration namespace
 */
interface GraphqlConfig {
  /** Enable query complexity logging */
  readonly logQueryComplexity: boolean;
  /** Maximum allowed query complexity */
  readonly maxComplexity: number;
}

/**
 * WebSocket configuration namespace
 */
interface WebsocketConfig {
  /** API Gateway WebSocket endpoint */
  readonly apiEndpoint: string | undefined;
}

/**
 * Complete application configuration
 */
export interface Configuration {
  readonly app: AppConfig;
  readonly database: DatabaseConfig;
  readonly valkey: ValkeyConfig;
  readonly cognito: CognitoConfig;
  readonly graphql: GraphqlConfig;
  readonly websocket: WebsocketConfig;
}

/**
 * Builds the database configuration namespace from environment variables.
 * @returns Database configuration object
 */
function buildDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DATABASE_HOST ?? DEFAULT_DATABASE_HOST,
    port: parseInt(
      process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT),
      10
    ),
    username: process.env.DATABASE_USER ?? DEFAULT_DATABASE_USER,
    password: process.env.DATABASE_PASSWORD ?? DEFAULT_DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME ?? DEFAULT_DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === "true",
    sslRejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    proxyHost: process.env.DATABASE_PROXY_HOST,
    proxyHostRead: process.env.DATABASE_PROXY_HOST_READ_1,
  };
}

/**
 * Configuration factory for NestJS ConfigModule
 * @description Loads all configuration from environment variables with type safety
 * @returns Complete typed configuration object
 */
export const configuration = (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isOffline: process.env.IS_OFFLINE === "true",
  },
  database: buildDatabaseConfig(),
  valkey: {
    host: process.env.VALKEY_HOST ?? DEFAULT_VALKEY_HOST,
    port: parseInt(process.env.VALKEY_PORT ?? String(DEFAULT_VALKEY_PORT), 10),
    maxRetriesPerRequest: 3,
  },
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
  },
  graphql: {
    logQueryComplexity: process.env.LOG_QUERY_COMPLEXITY === "true",
    maxComplexity: 100,
  },
  websocket: {
    apiEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
  },
});

/**
 * Determines if the application is running in a local environment
 * @description Checks for local development by examining IS_OFFLINE flag
 * (set by serverless-offline) or test environment.
 * @returns True if running locally or in tests, false for production
 */
export function isLocalEnvironment(): boolean {
  const isOffline = process.env.IS_OFFLINE === "true";
  const isTest = process.env.NODE_ENV === "test";

  return isOffline || isTest;
}
