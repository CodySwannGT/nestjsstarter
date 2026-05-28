/**
 * @file typeorm-xray-logger.test.ts
 * @description Unit tests for TypeORM X-Ray logger with graceful degradation
 * @module database
 */
import { vi, expect } from "vitest";
import {
  extractQueryType,
  extractTableName,
  sanitizeParameters,
  TypeOrmXRayLogger,
} from "./typeorm-xray-logger";

// Mock NestJS Logger to verify logging calls
vi.mock("@nestjs/common", () => ({
  Logger: vi.fn().mockImplementation(function () {
    return {
      debug: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }),
}));

/**
 * Test query strings to avoid duplicate string lint errors.
 */
const TEST_QUERIES = {
  SELECT_WITH_PARAM: "SELECT * FROM users WHERE id = $1",
  SELECT_SIMPLE: "SELECT * FROM users",
  SELECT_ONE: "SELECT 1",
} as const;

describe("TypeOrmXRayLogger", () => {
  describe("instantiation", () => {
    it("should create logger instance", () => {
      const logger = new TypeOrmXRayLogger();

      expect(logger).toBeInstanceOf(TypeOrmXRayLogger);
    });
  });

  describe("extractQueryType", () => {
    it("should extract query type from SELECT query", () => {
      const result = extractQueryType(TEST_QUERIES.SELECT_WITH_PARAM);

      expect(result).toBe("SELECT");
    });

    it("should extract query type from INSERT query", () => {
      const result = extractQueryType("INSERT INTO users (email) VALUES ($1)");

      expect(result).toBe("INSERT");
    });

    it("should extract query type from UPDATE query", () => {
      const result = extractQueryType(
        "UPDATE users SET name = $1 WHERE id = $2"
      );

      expect(result).toBe("UPDATE");
    });

    it("should extract query type from DELETE query", () => {
      const result = extractQueryType("DELETE FROM users WHERE id = $1");

      expect(result).toBe("DELETE");
    });

    it("should return OTHER for unknown query types", () => {
      const result = extractQueryType("CREATE TABLE users (id UUID)");

      expect(result).toBe("OTHER");
    });

    it("should handle lowercase queries", () => {
      const result = extractQueryType("select * from users");

      expect(result).toBe("SELECT");
    });

    it("should handle queries with leading whitespace", () => {
      const result = extractQueryType("   SELECT * FROM users");

      expect(result).toBe("SELECT");
    });
  });

  describe("extractTableName", () => {
    it("should extract table name from SELECT query", () => {
      const result = extractTableName(TEST_QUERIES.SELECT_WITH_PARAM);

      expect(result).toBe("users");
    });

    it("should extract table name from INSERT query", () => {
      const result = extractTableName(
        "INSERT INTO organizations (name) VALUES ($1)"
      );

      expect(result).toBe("organizations");
    });

    it("should extract table name from UPDATE query", () => {
      const result = extractTableName("UPDATE players SET score = $1");

      expect(result).toBe("players");
    });

    it("should extract table name from DELETE query", () => {
      const result = extractTableName(
        "DELETE FROM sessions WHERE expired = true"
      );

      expect(result).toBe("sessions");
    });

    it("should return unknown for unparseable queries", () => {
      const result = extractTableName("CREATE INDEX idx ON something");

      expect(result).toBe("unknown");
    });

    it("should handle quoted table names", () => {
      const result = extractTableName(
        'SELECT * FROM "user_accounts" WHERE id = $1'
      );

      expect(result).toBe("user_accounts");
    });
  });

  describe("sanitizeParameters", () => {
    it("should sanitize parameters by replacing with count", () => {
      const result = sanitizeParameters(["secret", "password123", "token"]);

      expect(result).toBe("[3 parameters]");
    });

    it("should handle empty parameters array", () => {
      const result = sanitizeParameters([]);

      expect(result).toBe("[]");
    });

    it("should handle undefined parameters", () => {
      const result = sanitizeParameters(undefined);

      expect(result).toBe("[]");
    });

    it("should not expose actual parameter values", () => {
      const result = sanitizeParameters([
        "password",
        "secret-token",
        "api-key",
      ]);

      expect(result).not.toContain("password");
      expect(result).not.toContain("secret-token");
      expect(result).not.toContain("api-key");
    });
  });

  describe("logQuery", () => {
    it("should log query without error", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logQuery(TEST_QUERIES.SELECT_WITH_PARAM, ["uuid"]);
      }).not.toThrow();
    });

    it("should handle queries without parameters", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logQuery(TEST_QUERIES.SELECT_SIMPLE);
      }).not.toThrow();
    });
  });

  describe("logQueryError", () => {
    it("should log query error without throwing", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logQueryError(
          new Error("Connection refused"),
          TEST_QUERIES.SELECT_SIMPLE,
          []
        );
      }).not.toThrow();
    });

    it("should handle string errors", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logQueryError("Timeout error", TEST_QUERIES.SELECT_SIMPLE, []);
      }).not.toThrow();
    });
  });

  describe("logQuerySlow", () => {
    it("should log slow query without error", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logQuerySlow(5000, TEST_QUERIES.SELECT_SIMPLE, []);
      }).not.toThrow();
    });
  });

  describe("logSchemaBuild", () => {
    it("should log schema build message without error", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logSchemaBuild("Creating table users");
      }).not.toThrow();
    });
  });

  describe("logMigration", () => {
    it("should log migration message without error", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.logMigration("Running migration 001-create-users");
      }).not.toThrow();
    });
  });

  describe("log", () => {
    it("should handle log level messages", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.log("log", "General log message");
      }).not.toThrow();
    });

    it("should handle info level messages", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.log("info", "Info message");
      }).not.toThrow();
    });

    it("should handle warn level messages", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.log("warn", "Warning message");
      }).not.toThrow();
    });

    it("should handle non-string messages", () => {
      const logger = new TypeOrmXRayLogger();

      expect(() => {
        logger.log("log", { key: "value" });
      }).not.toThrow();
    });
  });

  describe("graceful degradation", () => {
    it("should not throw when X-Ray unavailable", () => {
      const logger = new TypeOrmXRayLogger();

      // X-Ray SDK is not installed in test environment
      // Logger should fall back to NestJS Logger without throwing
      expect(() => {
        logger.logQuery(TEST_QUERIES.SELECT_ONE, []);
        logger.logQueryError("Test error", TEST_QUERIES.SELECT_ONE, []);
        logger.logQuerySlow(1000, TEST_QUERIES.SELECT_ONE, []);
        logger.logSchemaBuild("Test schema");
        logger.logMigration("Test migration");
        logger.log("log", "Test log");
      }).not.toThrow();
    });
  });
});
