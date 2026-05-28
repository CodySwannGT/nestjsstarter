/**
 * @file health.controller.ts
 * @description REST controller for health check endpoints with database connectivity monitoring
 * @module health
 */

import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";

/**
 * Controller for health check endpoints with database connectivity monitoring
 * @description Provides REST endpoints for load balancer health checks.
 * Uses @nestjs/terminus for production-ready health indicators including
 * TypeORM database connectivity verification.
 */
@Controller("health")
export class HealthController {
  /**
   * Creates a HealthController instance
   * @param health - Health check service
   * @param db - TypeORM health indicator for database checks
   */
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator
  ) {}

  /**
   * Comprehensive health check endpoint
   * @description Performs health checks on all registered indicators including
   * database connectivity via TypeORM pingCheck
   * @returns Promise resolving to health check results with status and details
   * @example GET /health → { status: "ok", info: { database: { status: "up" } }, ... }
   */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck("database")]);
  }
}
