# Task 13: Implement HealthController and Module with Tests (TDD)

## Objective
Create REST health check endpoint for ALB health checks.

## Step 1: Write Tests First

### src/health/health.controller.test.ts
```typescript
/**
 * @file health.controller.test.ts
 * @description Unit tests for health controller
 * @module health
 */

import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe("check", () => {
    it("should return ok status", () => {
      const result = controller.check();
      expect(result.status).toBe("ok");
    });

    it("should return timestamp", () => {
      const result = controller.check();
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
```

## Step 2: Run Tests (Should Fail)
```bash
bun run test:unit src/health/health.controller.test.ts
```

## Step 3: Implement Controller

### src/health/health.controller.ts
```typescript
/**
 * @file health.controller.ts
 * @description REST controller for health check endpoints
 * @module health
 */

import { Controller, Get } from "@nestjs/common";

/**
 * Health check response interface
 */
interface HealthResponse {
  readonly status: "ok" | "error";
  readonly timestamp: string;
}

/**
 * Controller for health check endpoints
 * @description Provides REST endpoints for load balancer health checks
 */
@Controller("health")
export class HealthController {
  /**
   * Basic health check endpoint
   * @returns Health status response
   * @example GET /health → { status: "ok", timestamp: "2024-01-15T..." }
   */
  @Get()
  check(): HealthResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
```

### src/health/health.module.ts
```typescript
/**
 * @file health.module.ts
 * @description NestJS module for health check functionality
 * @module health
 */

import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

/**
 * Module providing health check endpoints
 * @description Exports HealthController for REST health checks
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

## Step 4: Run Tests (Should Pass)
```bash
bun run test:unit src/health/health.controller.test.ts
```

## Step 5: Update AppModule
Add HealthModule to imports:

```typescript
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    // ... existing imports
    HealthModule,
  ],
})
export class AppModule {}
```

## Acceptance Criteria
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] Returns { status: "ok", timestamp: "..." }
- [ ] HealthModule added to AppModule imports
- [ ] JSDoc documentation
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/health/
bun run lint src/health/
```
