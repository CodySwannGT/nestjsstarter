# Task: Update AppModule to import DatabaseModule

**Type:** Task
**Parent:** 0004-create-database-module

## Description

Update the AppModule to import the DatabaseModule, placing it in the correct position within the imports array following the established module ordering pattern.

## Acceptance Criteria

- [ ] DatabaseModule imported at top of file
- [ ] DatabaseModule added to imports array
- [ ] Import positioned after ValkeyModule (both are infrastructure modules)
- [ ] Application still compiles without errors
- [ ] Existing tests continue to pass

## Relevant Research

**App Module Import Order** (research.md, `app.module.ts:26-53`):
Current order:
1. `GraphQLModule.forRootAsync()`
2. `DataLoaderModule`
3. `ValkeyModule`
4. `SubscriptionModule`
5. `HealthModule`
6. `HelloModule`

**DatabaseModule Placement** (research.md):
- Should be imported before feature modules that depend on database entities
- After ValkeyModule (both are infrastructure modules)
- Before any entity-dependent feature modules

**Reference file**: `src/app.module.ts`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to modify**: `src/app.module.ts`

**Changes**:
1. Add import statement at top of file:
   ```typescript
   import { DatabaseModule } from "./database/database.module";
   ```

2. Add to imports array after ValkeyModule:
   ```typescript
   imports: [
     GraphQLModule.forRootAsync(...),
     DataLoaderModule,
     ValkeyModule,
     DatabaseModule,  // Add after ValkeyModule
     SubscriptionModule,
     HealthModule,
     HelloModule,
   ],
   ```

## Testing Requirements

### Unit Tests
N/A - Module import, existing tests will verify functionality

### Integration Tests
N/A - Integration testing covered by app bootstrap

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - No new JSDoc required for import statement

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run build && grep -q "DatabaseModule" src/app.module.ts && echo "DatabaseModule added to AppModule"
```

### Expected Output
```text
DatabaseModule added to AppModule
```
TypeScript compilation should succeed and DatabaseModule should be found in app.module.ts.

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

N/A - Module import task, no specific tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read `src/app.module.ts`
2. Add import statement for DatabaseModule
3. Add DatabaseModule to imports array after ValkeyModule
4. Run TypeScript compilation to verify

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm TypeScript compiles without errors
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - No documentation requirements for this task.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
