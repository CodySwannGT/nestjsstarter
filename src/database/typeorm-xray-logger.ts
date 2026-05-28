/**
 * @file typeorm-xray-logger.ts
 * @description TypeORM logger with AWS X-Ray distributed tracing integration
 * @module database
 * @remarks
 * This logger provides:
 * - AWS X-Ray subsegment creation for each query
 * - Query type and table name extraction for metrics
 * - Parameter sanitization (no sensitive data logged)
 * - Graceful degradation when X-Ray is unavailable
 * - Never throws exceptions (defensive programming)
 *
 * In local development without X-Ray, falls back to NestJS Logger.
 */
import { Logger as NestLogger } from "@nestjs/common";
import type { Logger as TypeOrmLogger, QueryRunner } from "typeorm";

import { getXRaySegment } from "../tracing";

/**
 * X-Ray segment interface for type safety.
 * @remarks
 * Used internally for type-safe interaction with the segment returned by getXRaySegment()
 */
interface XRaySegment {
  addNewSubsegment(name: string): XRaySubsegment;
}

/**
 * X-Ray subsegment interface for type safety.
 */
interface XRaySubsegment {
  addAnnotation(key: string, value: string | number | boolean): void;
  addMetadata(key: string, value: unknown): void;
  addError(error: Error): void;
  close(): void;
}

/**
 * Query type extracted from SQL.
 */
type QueryType = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "OTHER";

/**
 * X-Ray annotation keys for database operations.
 */
const XRAY_ANNOTATION = {
  DB_TYPE: "db.type",
  DB_OPERATION: "db.operation",
  DB_TABLE: "db.table",
  DB_ERROR: "db.error",
  DB_SLOW: "db.slow",
  DB_DURATION_MS: "db.duration_ms",
} as const;

/**
 * Database type annotation value.
 */
const DB_TYPE_POSTGRESQL = "postgresql";

/**
 * Extract query type from SQL string.
 * @param query - The SQL query string
 * @returns The query type (SELECT, INSERT, UPDATE, DELETE, or OTHER)
 */
export const extractQueryType = (query: string): QueryType => {
  const normalized = query.trim().toUpperCase();

  if (normalized.startsWith("SELECT")) return "SELECT";
  if (normalized.startsWith("INSERT")) return "INSERT";
  if (normalized.startsWith("UPDATE")) return "UPDATE";
  if (normalized.startsWith("DELETE")) return "DELETE";

  return "OTHER";
};

/**
 * Extract table name from SQL string.
 * @param query - The SQL query string
 * @returns The table name or "unknown" if not parseable
 */
export const extractTableName = (query: string): string => {
  const patterns = [
    /FROM\s+["']?(\w+)["']?/i,
    /INTO\s+["']?(\w+)["']?/i,
    /UPDATE\s+["']?(\w+)["']?/i,
    /DELETE\s+FROM\s+["']?(\w+)["']?/i,
  ];

  const results = patterns
    .map(pattern => pattern.exec(query))
    .filter((match): match is RegExpExecArray => match !== null);

  return results[0]?.[1] ?? "unknown";
};

/**
 * Sanitize query parameters to prevent logging sensitive data.
 * @param parameters - The query parameters
 * @returns Sanitized parameter representation showing only count
 */
export const sanitizeParameters = (
  parameters: readonly unknown[] | undefined
): string => {
  if (!parameters || parameters.length === 0) return "[]";

  return `[${parameters.length} parameters]`;
};

/**
 * TypeORM logger with AWS X-Ray distributed tracing integration.
 * @description
 * Custom TypeORM logger that creates X-Ray subsegments for each database query,
 * enabling distributed tracing in production while gracefully degrading in local
 * development when the X-Ray SDK is unavailable.
 * @implements {TypeOrmLogger}
 * @example
 * ```typescript
 * import { TypeOrmXRayLogger } from "./typeorm-xray-logger";
 *
 * const createConfig = (): DataSourceOptions => ({
 *   type: "postgres",
 *   logging: ["query", "error", "warn"],
 *   logger: new TypeOrmXRayLogger(),
 * });
 * ```
 */
export class TypeOrmXRayLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger("TypeORM");

  /**
   * Create an X-Ray subsegment for a database operation.
   * @param name - The subsegment name
   * @returns The subsegment or null if X-Ray unavailable
   */
  private createSubsegment(name: string): XRaySubsegment | null {
    try {
      const segment = getXRaySegment() as XRaySegment | null;

      return segment?.addNewSubsegment(name) ?? null;
    } catch {
      // Silently fail - X-Ray tracing is optional
      return null;
    }
  }

  /**
   * Close a subsegment safely.
   * @param subsegment - The subsegment to close
   */
  private closeSubsegment(subsegment: XRaySubsegment | null): void {
    try {
      subsegment?.close();
    } catch {
      // Silently fail - never throw from logger
    }
  }

  /**
   * Log a query with X-Ray tracing.
   * @param query - The SQL query
   * @param parameters - Query parameters
   * @param _queryRunner - TypeORM query runner (unused)
   */
  logQuery(
    query: string,
    parameters?: readonly unknown[],
    _queryRunner?: QueryRunner
  ): void {
    const queryType = extractQueryType(query);
    const tableName = extractTableName(query);
    const subsegment = this.createSubsegment(`db-${queryType.toLowerCase()}`);

    try {
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TYPE, DB_TYPE_POSTGRESQL);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_OPERATION, queryType);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TABLE, tableName);
      subsegment?.addMetadata("query", query);
      subsegment?.addMetadata("parameters", sanitizeParameters(parameters));

      this.logger.debug(
        `[${queryType}] ${tableName}: ${query.substring(0, 100)}...`
      );
    } finally {
      this.closeSubsegment(subsegment);
    }
  }

  /**
   * Log a failed query with X-Ray error tracking.
   * @param error - The error message or Error object
   * @param query - The SQL query that failed
   * @param parameters - Query parameters
   * @param _queryRunner - TypeORM query runner (unused)
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: readonly unknown[],
    _queryRunner?: QueryRunner
  ): void {
    const queryType = extractQueryType(query);
    const tableName = extractTableName(query);
    const subsegment = this.createSubsegment(
      `db-${queryType.toLowerCase()}-error`
    );

    try {
      const errorObj = typeof error === "string" ? new Error(error) : error;

      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TYPE, DB_TYPE_POSTGRESQL);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_OPERATION, queryType);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TABLE, tableName);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_ERROR, true);
      subsegment?.addError(errorObj);
      subsegment?.addMetadata("query", query);
      subsegment?.addMetadata("parameters", sanitizeParameters(parameters));

      this.logger.error(
        `[${queryType}] ${tableName} FAILED: ${errorObj.message}`,
        errorObj.stack
      );
    } finally {
      this.closeSubsegment(subsegment);
    }
  }

  /**
   * Log a slow query with X-Ray annotation.
   * @param time - Query execution time in milliseconds
   * @param query - The SQL query
   * @param parameters - Query parameters
   * @param _queryRunner - TypeORM query runner (unused)
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: readonly unknown[],
    _queryRunner?: QueryRunner
  ): void {
    const queryType = extractQueryType(query);
    const tableName = extractTableName(query);
    const subsegment = this.createSubsegment(
      `db-${queryType.toLowerCase()}-slow`
    );

    try {
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TYPE, DB_TYPE_POSTGRESQL);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_OPERATION, queryType);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_TABLE, tableName);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_SLOW, true);
      subsegment?.addAnnotation(XRAY_ANNOTATION.DB_DURATION_MS, time);
      subsegment?.addMetadata("query", query);
      subsegment?.addMetadata("parameters", sanitizeParameters(parameters));

      this.logger.warn(
        `[SLOW ${time}ms] [${queryType}] ${tableName}: ${query.substring(0, 100)}...`
      );
    } finally {
      this.closeSubsegment(subsegment);
    }
  }

  /**
   * Log schema build operations.
   * @param message - The log message
   * @param _queryRunner - TypeORM query runner (unused)
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    this.logger.log(`[Schema] ${message}`);
  }

  /**
   * Log migration operations.
   * @param message - The log message
   * @param _queryRunner - TypeORM query runner (unused)
   */
  logMigration(message: string, _queryRunner?: QueryRunner): void {
    this.logger.log(`[Migration] ${message}`);
  }

  /**
   * Log general TypeORM messages.
   * @param level - The log level (log, info, or warn)
   * @param message - The log message
   * @param _queryRunner - TypeORM query runner (unused)
   */
  log(
    level: "log" | "info" | "warn",
    message: unknown,
    _queryRunner?: QueryRunner
  ): void {
    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);

    if (level === "warn") {
      this.logger.warn(messageStr);
    } else {
      this.logger.log(messageStr);
    }
  }
}
