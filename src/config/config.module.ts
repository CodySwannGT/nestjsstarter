/**
 * @file config.module.ts
 * @description Application configuration module using NestJS ConfigModule
 * @module config
 * @remarks
 * This module wraps @nestjs/config ConfigModule with:
 * - Global availability across all modules
 * - Type-safe configuration via configuration factory
 * - Environment variable loading
 *
 * Usage in services:
 * ```typescript
 * constructor(private readonly configService: ConfigService<Configuration, true>) {}
 *
 * const host = this.configService.get('database.host', { infer: true });
 * ```
 */
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { configuration } from "./configuration";

/**
 * Application configuration module
 * @description Provides centralized, type-safe configuration access via ConfigService
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
  ],
})
export class ConfigModule {}
