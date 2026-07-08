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
 * - sentry: Sentry error-tracking and tracing settings
 */

/** Default Sentry environment name when none is configured */
const DEFAULT_SENTRY_ENVIRONMENT = "development";

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

/**
 * Default maximum GraphQL operation depth. Relay-style connections add ~+2 per
 * level (`edges → node → field`), so 10 leaves headroom for legitimately rich
 * queries while blocking pathological deep recursion. Introspection is exempt
 * regardless (see src/graphql/introspection.util.ts).
 */
const DEFAULT_GRAPHQL_MAX_DEPTH = 10;

/**
 * Default maximum operations per batched GraphQL HTTP POST. Mirrors a typical
 * client `BatchHttpLink` `batchMax` of 10 so a full legitimate batch passes
 * (only length > 10, i.e. 11+, is rejected). Keep in lockstep with the client
 * value if it ever changes.
 */
const DEFAULT_GRAPHQL_MAX_BATCH_OPERATIONS = 10;

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
  /** Maximum allowed operation depth (validation rule, see src/graphql/depth-limit.rule.ts) */
  readonly maxDepth: number;
  /** Maximum operations per batched GraphQL HTTP POST (see src/graphql/batch-cap.middleware.ts) */
  readonly maxBatchOperations: number;
}

/**
 * WebSocket configuration namespace
 */
interface WebsocketConfig {
  /** API Gateway WebSocket endpoint */
  readonly apiEndpoint: string | undefined;
}

/**
 * Sentry error-tracking and tracing configuration namespace
 * @remarks
 * The SDK itself is initialized from environment variables at process startup
 * (see src/sentry/sentry.config.ts) because init must run before the
 * ConfigService exists. This namespace exposes the same values for type-safe
 * access elsewhere and documents the supported env vars. Defaults are
 * offline-safe: no DSN and zero sample rates mean Sentry is fully inert.
 */
interface SentryConfig {
  /** Sentry DSN; undefined/empty disables Sentry entirely */
  readonly dsn: string | undefined;
  /** Environment name reported to Sentry (e.g. dev, staging, production) */
  readonly environment: string;
  /** Fraction of transactions traced (0..1); 0 disables tracing */
  readonly tracesSampleRate: number;
  /** Fraction of traced transactions profiled (0..1); 0 disables profiling */
  readonly profilesSampleRate: number;
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
  readonly sentry: SentryConfig;
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
 * Builds the GraphQL configuration namespace from environment variables.
 * @returns GraphQL configuration object with offline-safe defaults
 */
function buildGraphqlConfig(): GraphqlConfig {
  return {
    logQueryComplexity: process.env.LOG_QUERY_COMPLEXITY === "true",
    maxComplexity: 100,
    maxDepth: parseInt(
      process.env.GRAPHQL_MAX_DEPTH ?? String(DEFAULT_GRAPHQL_MAX_DEPTH),
      10
    ),
    maxBatchOperations: parseInt(
      process.env.GRAPHQL_MAX_BATCH_OPERATIONS ??
        String(DEFAULT_GRAPHQL_MAX_BATCH_OPERATIONS),
      10
    ),
  };
}

/**
 * Parses a Sentry sample-rate env var into a number in the range [0, 1].
 * @param raw - The raw environment variable value, if any.
 * @returns The parsed rate, or 0 when unset or not a finite number.
 */
function parseSampleRate(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Builds the Sentry configuration namespace from environment variables.
 * @returns Sentry configuration object with offline-safe defaults
 */
function buildSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN,
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.STAGE ??
      DEFAULT_SENTRY_ENVIRONMENT,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    profilesSampleRate: parseSampleRate(
      process.env.SENTRY_PROFILES_SAMPLE_RATE
    ),
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
  graphql: buildGraphqlConfig(),
  websocket: {
    apiEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
  },
  sentry: buildSentryConfig(),
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
