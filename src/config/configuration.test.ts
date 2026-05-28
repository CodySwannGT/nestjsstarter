/**
 * @file configuration.test.ts
 * @description Unit tests for configuration factory and utility functions
 * @module config
 * @remarks
 * Tests verify correct environment variable parsing and the isLocalEnvironment
 * utility function behavior across different runtime contexts.
 */

import { expect } from "vitest";
import { configuration, isLocalEnvironment } from "./configuration";

/**
 * Saves original environment variables for restoration after tests
 */
const originalEnv = process.env;

describe("configuration", () => {
  beforeEach(() => {
    // Reset environment to clean state for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default values when no environment variables are set", () => {
    delete process.env.NODE_ENV;
    delete process.env.IS_OFFLINE;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_NAME;
    delete process.env.VALKEY_HOST;
    delete process.env.VALKEY_PORT;

    const config = configuration();

    expect(config.database.host).toBe("localhost");
    expect(config.database.port).toBe(5432);
    expect(config.database.username).toBe("thumbwar");
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Test value, not a real credential
    expect(config.database.password).toBe("thumbwar_local");
    expect(config.database.name).toBe("thumbwar");
    expect(config.valkey.host).toBe("localhost");
    expect(config.valkey.port).toBe(6379);
    expect(config.valkey.maxRetriesPerRequest).toBe(3);
    expect(config.graphql.maxComplexity).toBe(100);
  });

  it("should read custom environment variables", () => {
    process.env.DATABASE_HOST = "custom-db-host";
    process.env.DATABASE_PORT = "5433";
    process.env.DATABASE_USER = "custom-user";
    process.env.DATABASE_NAME = "custom-db";
    process.env.VALKEY_HOST = "custom-valkey";
    process.env.VALKEY_PORT = "6380";

    const config = configuration();

    expect(config.database.host).toBe("custom-db-host");
    expect(config.database.port).toBe(5433);
    expect(config.database.username).toBe("custom-user");
    expect(config.database.name).toBe("custom-db");
    expect(config.valkey.host).toBe("custom-valkey");
    expect(config.valkey.port).toBe(6380);
  });

  it("should set isOffline to true when IS_OFFLINE=true", () => {
    process.env.IS_OFFLINE = "true";

    const config = configuration();

    expect(config.app.isOffline).toBe(true);
  });

  it("should set isOffline to false when IS_OFFLINE is not set", () => {
    delete process.env.IS_OFFLINE;

    const config = configuration();

    expect(config.app.isOffline).toBe(false);
  });

  it("should set isOffline to false when IS_OFFLINE=false", () => {
    process.env.IS_OFFLINE = "false";

    const config = configuration();

    // Only the exact string "true" activates isOffline
    expect(config.app.isOffline).toBe(false);
  });

  it("should set ssl to true when DATABASE_SSL=true", () => {
    process.env.DATABASE_SSL = "true";

    const config = configuration();

    expect(config.database.ssl).toBe(true);
  });

  it("should set sslRejectUnauthorized to false when DATABASE_SSL_REJECT_UNAUTHORIZED=false", () => {
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";

    const config = configuration();

    expect(config.database.sslRejectUnauthorized).toBe(false);
  });

  it("should set sslRejectUnauthorized to true by default", () => {
    delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;

    const config = configuration();

    expect(config.database.sslRejectUnauthorized).toBe(true);
  });

  it("should read Cognito configuration from environment", () => {
    process.env.COGNITO_USER_POOL_ID = "us-east-1_abc123";
    process.env.COGNITO_CLIENT_ID = "client-123";

    const config = configuration();

    expect(config.cognito.userPoolId).toBe("us-east-1_abc123");
    expect(config.cognito.clientId).toBe("client-123");
  });

  it("should return undefined Cognito values when not set", () => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;

    const config = configuration();

    expect(config.cognito.userPoolId).toBeUndefined();
    expect(config.cognito.clientId).toBeUndefined();
  });

  it("should set logQueryComplexity to true when LOG_QUERY_COMPLEXITY=true", () => {
    process.env.LOG_QUERY_COMPLEXITY = "true";

    const config = configuration();

    expect(config.graphql.logQueryComplexity).toBe(true);
  });

  it("should set logQueryComplexity to false by default", () => {
    delete process.env.LOG_QUERY_COMPLEXITY;

    const config = configuration();

    expect(config.graphql.logQueryComplexity).toBe(false);
  });

  it("should read proxy host configuration", () => {
    process.env.DATABASE_PROXY_HOST = "proxy.example.com";
    process.env.DATABASE_PROXY_HOST_READ_1 = "proxy-read.example.com";

    const config = configuration();

    expect(config.database.proxyHost).toBe("proxy.example.com");
    expect(config.database.proxyHostRead).toBe("proxy-read.example.com");
  });

  it("should return undefined for proxy hosts when not set", () => {
    delete process.env.DATABASE_PROXY_HOST;
    delete process.env.DATABASE_PROXY_HOST_READ_1;

    const config = configuration();

    expect(config.database.proxyHost).toBeUndefined();
    expect(config.database.proxyHostRead).toBeUndefined();
  });

  it("should read websocket API endpoint", () => {
    process.env.WEBSOCKET_API_ENDPOINT = "https://ws.example.com";

    const config = configuration();

    expect(config.websocket.apiEndpoint).toBe("https://ws.example.com");
  });

  it("should return undefined for websocket apiEndpoint when not set", () => {
    delete process.env.WEBSOCKET_API_ENDPOINT;

    const config = configuration();

    expect(config.websocket.apiEndpoint).toBeUndefined();
  });
});

describe("isLocalEnvironment", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true when IS_OFFLINE=true", () => {
    process.env.IS_OFFLINE = "true";
    process.env.NODE_ENV = "production";

    expect(isLocalEnvironment()).toBe(true);
  });

  it("should return true when NODE_ENV=test", () => {
    delete process.env.IS_OFFLINE;
    process.env.NODE_ENV = "test";

    expect(isLocalEnvironment()).toBe(true);
  });

  it("should return true when both IS_OFFLINE=true and NODE_ENV=test", () => {
    process.env.IS_OFFLINE = "true";
    process.env.NODE_ENV = "test";

    expect(isLocalEnvironment()).toBe(true);
  });

  it("should return false when neither IS_OFFLINE nor test env", () => {
    process.env.IS_OFFLINE = "false";
    process.env.NODE_ENV = "production";

    expect(isLocalEnvironment()).toBe(false);
  });

  it("should return false when IS_OFFLINE is not set and NODE_ENV is development", () => {
    delete process.env.IS_OFFLINE;
    process.env.NODE_ENV = "development";

    expect(isLocalEnvironment()).toBe(false);
  });
});
