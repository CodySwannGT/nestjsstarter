# Task: Add ConfigModule Integration

**Type:** Task
**Parent:** None

## Description

Ensure the NestJS `ConfigModule` is properly configured at the application level so that `ConfigService` can be injected throughout the application, including in the auth module. This may require updating the root `AppModule`.

## Acceptance Criteria

- [ ] `ConfigModule.forRoot()` is called in `AppModule` (if not already)
- [ ] `ConfigModule` is set as global or imported where needed
- [ ] `IS_OFFLINE` environment variable is accessible via `ConfigService`
- [ ] Cognito configuration variables are accessible: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION`
- [ ] Build and lint pass
- [ ] Existing tests continue to pass

## Relevant Research

From `research.md`:
- Open Question Q3 Answer: "Use NestJS ConfigService for environment detection"
- Current codebase uses `process.env` directly in many places
- `@nestjs/config` is already in package.json (via `ConfigModule` usage)

From NestJS documentation:
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class AppModule {}
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS module patterns

## Implementation Details

### Check Current AppModule Configuration

First, check if `ConfigModule` is already configured in `src/app.module.ts`. If not, add it.

### File: `src/app.module.ts` (update if needed)

Add to imports if not present:

```typescript
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available everywhere
      envFilePath: [".env.local", ".env"],
    }),
    // ... other imports
    AuthModule,
  ],
  // ...
})
export class AppModule {}
```

### Environment Variables Required

Document the required environment variables in a comment or README:

```bash
# Local development
IS_OFFLINE=true

# Production (Cognito)
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxx
AWS_REGION=us-east-1
```

## Testing Requirements

### Unit Tests
N/A - Configuration verified by build and runtime

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Update AppModule JSDoc if ConfigModule added

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run build && bun run test:unit
```

### Expected Output
Build succeeds. All existing unit tests pass.

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

Skip - configuration verified by build.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Check current AppModule configuration
2. Add ConfigModule.forRoot() if not present
3. Ensure AuthModule is imported
4. Run build to verify

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
