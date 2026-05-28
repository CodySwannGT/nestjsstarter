# Task: Configure AuthModule with Providers and Exports

**Type:** Task
**Parent:** None

## Description

Update the existing `AuthModule` to register all authentication providers, services, and guards. This wires together all the components created in previous tasks.

## Acceptance Criteria

- [ ] `AuthModule` updated at `src/auth/auth.module.ts`
- [ ] Imports `ConfigModule` for environment configuration
- [ ] Registers all providers: `AuthService`, `LocalAuthService`, `CognitoService`, `authServiceProvider`
- [ ] Registers `AuthResolver` for GraphQL
- [ ] Registers `JwtAuthGuard` as provider
- [ ] Exports `AUTH_SERVICE` token for other modules
- [ ] Exports `JwtAuthGuard` for use in other modules
- [ ] JSDoc documentation updated
- [ ] Existing tests continue to pass
- [ ] Type checking passes

## Relevant Research

From `brief.md` task 8:
```typescript
@Module({
  providers: [
    AuthService,
    LocalAuthService,
    authServiceProvider,
    // ... existing providers
  ],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
```

From `research.md` - subscription module pattern:
```typescript
@Global()
@Module({
  imports: [ValkeyModule],
  providers: [{ provide: PUB_SUB, useFactory: ... }],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
```

From existing `src/auth/auth.module.ts`:
- Currently an empty module shell
- Only provides authorization decorators

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS module patterns

## Implementation Details

### File: `src/auth/auth.module.ts`

```typescript
/**
 * @file auth.module.ts
 * @description NestJS module for authentication and authorization
 * @module auth
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { LocalAuthService } from "./services/local-auth.service";
import { CognitoService } from "./services/cognito.service";
import { AUTH_SERVICE, authServiceProvider } from "./providers/auth-service.provider";
import { AuthResolver } from "./auth.resolver";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

/**
 * Module providing authentication and authorization functionality
 * @description Provides auth services, resolver, and guards for the application
 * @remarks
 * - Uses ConfigModule for environment-based service selection
 * - Exports AUTH_SERVICE for use by other modules
 * - Exports JwtAuthGuard for protecting routes
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core services
    CognitoService,
    AuthService,
    LocalAuthService,

    // Provider factory for environment-based selection
    authServiceProvider,

    // GraphQL resolver
    AuthResolver,

    // Guards
    JwtAuthGuard,
  ],
  exports: [AUTH_SERVICE, JwtAuthGuard],
})
export class AuthModule {}
```

### Update Index File

Update `src/auth/index.ts` to export new public API:

```typescript
// Authorization decorators
export * from "./decorators";
export * from "./auth.types";
export * from "./auth.transformer";

// Authentication exports
export { AUTH_SERVICE } from "./providers/auth-service.provider";
export { IAuthService } from "./interfaces/auth-service.interface";
export { JwtAuthGuard } from "./guards/jwt-auth.guard";

// Types for consumers
export * from "./types";
export * from "./inputs";
```

## Testing Requirements

### Unit Tests
N/A - Module configuration is verified by successful application bootstrap

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `AuthModule` class - @description, @remarks

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no direct GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run build && bun run lint
```

### Expected Output
No TypeScript compilation errors. No linting errors. Module compiles successfully.

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

Skip - module configuration verified by build.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Update auth.module.ts with all imports and providers
2. Update index.ts with new exports
3. Run build to verify configuration

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
