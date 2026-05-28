/**
 * @file health.module.ts
 * @description NestJS module for health check functionality with database health indicators
 * @module health
 */

import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

/**
 * Module providing health check endpoints with database connectivity monitoring
 * @description Imports TerminusModule for production-ready health checks
 * and exports HealthController for REST health endpoints
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
