/**
 * @file valkey.module.ts
 * @description NestJS module for Valkey connection and operations
 * @module valkey
 */

import { Global, Module } from "@nestjs/common";
import { ValkeyService } from "./valkey.service";

/**
 * Module providing Valkey connection service
 * @description Global module that provides ValkeyService to all other modules
 * @remarks
 * - Marked as @Global so it doesn't need to be imported in each feature module
 * - ValkeyService handles connection lifecycle automatically
 */
@Global()
@Module({
  providers: [ValkeyService],
  exports: [ValkeyService],
})
export class ValkeyModule {}
