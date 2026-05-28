/**
 * @file database.module.ts
 * @description Database module for PostgreSQL/TypeORM configuration
 * @module database
 * @remarks
 * Uses forRootAsync with dataSourceFactory for:
 * - Async configuration via ConfigService
 * - Custom DataSource initialization
 * - Replication support with dynamic passwords
 */
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";
import { Configuration } from "../config/configuration";
import { createTypeOrmOptionsFromConfigService } from "./database.config";

/**
 * Database module
 * @description Configures TypeORM with PostgreSQL for the application
 * @remarks
 * - Uses ConfigService for type-safe configuration access
 * - Uses dataSourceFactory for full control over DataSource initialization
 * - Supports SSL for Aurora Serverless in production
 * - Supports read-write replication in production
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration, true>) =>
        createTypeOrmOptionsFromConfigService(configService),
      dataSourceFactory: async (options?: DataSourceOptions) => {
        if (!options) {
          throw new Error("DataSource options are required");
        }
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),
  ],
})
export class DatabaseModule {}
