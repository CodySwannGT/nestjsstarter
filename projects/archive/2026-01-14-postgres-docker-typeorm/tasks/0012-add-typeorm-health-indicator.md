# Task: Add TypeORM health indicator to health module

**Type:** Task
**Parent:** 0011-install-terminus

## Description

Update the health module to include database connectivity checking using the TypeOrmHealthIndicator from @nestjs/terminus. This provides production-ready health checks for monitoring database availability.

## Acceptance Criteria

- [ ] TerminusModule imported in HealthModule
- [ ] TypeOrmHealthIndicator added to health check
- [ ] Health controller uses HealthCheckService from terminus
- [ ] Health endpoint returns database connectivity status
- [ ] Unit tests written for health check functionality

## Relevant Research

**Health Check Approach** (research.md, Q2 Answer):
- Use @nestjs/terminus for health checks

**Current Health Implementation** (research.md, `health.controller.ts:1-35`):
- Simple REST controller at `/health`
- Returns `{ status: "ok", timestamp: ISO string }`
- No database connectivity checks currently

**Extension Pattern for Database Health** (research.md):
- Option 1: Add TypeOrmHealthIndicator from @nestjs/terminus (chosen)
- Option 2: Create custom health check that executes `SELECT 1`

**Reference files**:
- `src/health/health.module.ts`
- `src/health/health.controller.ts`

**External resources** (research.md):
- [Health checks with Terminus](https://sevic.dev/notes/healthcheck-terminus-nestjs/)
- [TypeOrmHealthIndicator Source](https://github.com/nestjs/terminus/blob/master/lib/health-indicator/database/typeorm.health.ts)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**Files to modify**:
- `src/health/health.module.ts`
- `src/health/health.controller.ts`

**HealthModule changes**:
```typescript
import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

**HealthController changes**:
```typescript
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
    ]);
  }
}
```

## Testing Requirements

### Unit Tests
Reference pattern from testing section of research.md.

- [ ] `describe('HealthController')/it('should be defined')`: Verify controller compiles
- [ ] `describe('HealthController')/it('should return health check results')`: Verify health check returns expected format
- [ ] `describe('HealthController')/it('should include database health indicator')`: Verify database check is included

### Integration Tests
N/A - Integration testing requires running database

### E2E Tests
N/A - Can be tested manually via curl

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Update `HealthController` with `@description` for new functionality
- [ ] Document `check()` method with `@returns` describing response format

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="health" --passWithNoTests
```

### Expected Output
Tests should pass with health check functionality confirmed.

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write failing tests
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create or update `src/health/health.controller.test.ts`
2. Write tests for health check functionality
3. Run tests to confirm they fail

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read existing health module and controller
2. Update HealthModule to import TerminusModule
3. Update HealthController to use HealthCheckService and TypeOrmHealthIndicator
4. Run tests to confirm they pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output shows tests passing
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Update JSDoc documentation in HealthController per Documentation Requirements.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
