# Task: Create Auth Service Provider Factory

**Type:** Task
**Parent:** None

## Description

Create a provider factory that selects between `AuthService` (production) and `LocalAuthService` (development) based on the `IS_OFFLINE` environment variable. This enables seamless switching between local and production authentication.

## Acceptance Criteria

- [ ] Provider file created at `src/auth/providers/auth-service.provider.ts`
- [ ] Exports `AUTH_SERVICE` injection token constant
- [ ] Exports `authServiceProvider` factory provider
- [ ] Factory uses `ConfigService` to check `IS_OFFLINE`
- [ ] Returns `LocalAuthService` when `IS_OFFLINE=true`
- [ ] Returns `AuthService` when `IS_OFFLINE` is not `true`
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify correct service selection

## Relevant Research

From `brief.md` task 4:
```typescript
export const AUTH_SERVICE = "AUTH_SERVICE";

export const authServiceProvider: Provider = {
  provide: AUTH_SERVICE,
  useFactory: (configService, authService, localAuthService) => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
```

From `research.md`:
- Provider factory pattern from `src/subscription/subscription.module.ts`
- Open Question Q3: Use NestJS ConfigService for environment detection

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS provider patterns

## Implementation Details

### File: `src/auth/providers/auth-service.provider.ts`

```typescript
/**
 * @file auth-service.provider.ts
 * @description Provider factory for selecting auth service based on environment
 * @module auth
 */

import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../services/auth.service";
import { LocalAuthService } from "../services/local-auth.service";
import { IAuthService } from "../interfaces/auth-service.interface";

/**
 * Injection token for auth service
 * @description Use this token to inject the appropriate auth service
 */
export const AUTH_SERVICE = "AUTH_SERVICE";

/**
 * Factory provider for auth service
 * @description Selects LocalAuthService for local dev, AuthService for production
 */
export const authServiceProvider: Provider<IAuthService> = {
  provide: AUTH_SERVICE,
  useFactory: (
    configService: ConfigService,
    authService: AuthService,
    localAuthService: LocalAuthService
  ): IAuthService => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/providers/auth-service.provider.test.ts`:
- [ ] `describe('AUTH_SERVICE')/it('should be defined as string constant')`: Token exists
- [ ] `describe('authServiceProvider')/it('should provide AUTH_SERVICE token')`: Provider shape
- [ ] `describe('authServiceProvider')/it('should return LocalAuthService when IS_OFFLINE=true')`: Local mode
- [ ] `describe('authServiceProvider')/it('should return AuthService when IS_OFFLINE is not true')`: Production mode
- [ ] `describe('authServiceProvider')/it('should return AuthService when IS_OFFLINE is undefined')`: Default behavior

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `AUTH_SERVICE` constant - @description
- [ ] `authServiceProvider` - @description

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no direct GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/providers/.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/providers/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

### Expected Output
All tests pass. Coverage meets 80% threshold.

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write failing tests
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

**CRITICAL**: DO NOT STOP until all todos are marked completed.

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke each skill listed in "Applicable Skills" using the Skill tool

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create test file
2. Write tests for provider factory behavior
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/auth/providers/` directory
2. Create auth-service.provider.ts
3. Run tests until they pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Complete all items in Documentation Requirements section.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
