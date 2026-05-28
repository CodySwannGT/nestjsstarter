/**
 * @file typeorm.config.ts
 * @description TypeORM CLI DataSource configuration for migrations
 * @module database
 * @remarks
 * This file is used by TypeORM CLI for running migrations.
 * It differs from the NestJS runtime configuration in that it uses
 * glob patterns for entity/migration discovery (required for CLI).
 */
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { createLocalConfig } from "./src/database/database.config";

/**
 * TypeORM DataSource for CLI operations.
 * @description Used by TypeORM CLI for running migrations.
 * @remarks
 * - This file is used by typeorm-ts-node-commonjs CLI
 * - Uses SnakeNamingStrategy for consistent snake_case column names
 * - Uses glob patterns for entity/migration discovery (CLI requirement)
 * - Reads environment variables with fallback to defaults
 */
export default new DataSource({
  ...createLocalConfig(),
  namingStrategy: new SnakeNamingStrategy(),
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
});
