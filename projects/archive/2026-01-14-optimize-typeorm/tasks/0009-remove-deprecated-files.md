# Task: Remove Deprecated Files

**Type:** Task
**Parent:** None

## Description

Clean up deprecated files that have been replaced by new implementations. This includes removing the old `database.interface.ts`, its test file, and placeholder `.keep` files.

## Acceptance Criteria

- [ ] `src/database/database.interface.ts` is deleted
- [ ] `src/database/database.interface.test.ts` is deleted
- [ ] `src/database/entities/.keep` is deleted
- [ ] No imports reference deleted files
- [ ] Build passes with no errors
- [ ] Tests pass with no errors

## Relevant Research

From brief.md Task 6.1:

- Delete `src/database/database.interface.ts`
- Delete `src/database/database.interface.test.ts`
- Delete `src/database/entities/.keep`
- Delete `src/database/migrations/.keep` (if empty after setup)

From brief.md Task 6.2:

Search and update any imports of:
- `database.interface` -> `database.config`
- `createBaseTypeOrmConfig` -> appropriate new function

From research.md "Files to Delete":
- `src/database/database.interface.ts` - Replaced by database.config.ts
- `src/database/database.interface.test.ts` - Tests will be migrated
- `src/database/entities/.keep` - Replaced by actual files

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Clean deletion principle

## Implementation Details

**Files to delete:**
- `src/database/database.interface.ts`
- `src/database/database.interface.test.ts`
- `src/database/entities/.keep`

**Verification before deletion:**
1. Ensure no other files import from `database.interface`
2. Ensure `typeorm.config.ts` has been updated (Task 0008)
3. Ensure `database.module.ts` has been updated (Task 0007)

**Deletion order:**
1. First verify no remaining imports
2. Delete test file
3. Delete implementation file
4. Delete .keep file

## Testing Requirements

### Unit Tests
N/A - Deletion task

### Integration Tests
N/A - Deletion task

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - No code changes

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && ls src/database/database.interface.ts 2>&1 || echo "File deleted" && ls src/database/database.interface.test.ts 2>&1 || echo "File deleted" && ls src/database/entities/.keep 2>&1 || echo "File deleted" && bun run build && bun run test
```

### Expected Output
- All three files report "File deleted" (ls fails with "No such file")
- Build passes
- All tests pass

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Verify no remaining imports
- Delete files
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Verify No Remaining Imports
Mark "Verify no remaining imports" as in_progress.

1. Search codebase for imports of `database.interface`
2. Ensure no references remain (should all be updated in previous tasks)
3. If any remain, this task is blocked until they are updated

Mark "Verify no remaining imports" as completed.

### Step 3: Delete Files
Mark "Delete files" as in_progress.

Delete the following files:
```bash
rm src/database/database.interface.test.ts
rm src/database/database.interface.ts
rm src/database/entities/.keep
```

Mark "Delete files" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run `bun run build` to verify no broken imports
2. Run `bun run test` to verify all tests still pass
3. Run `bun run lint` to verify no ESLint errors

Mark "Verify implementation" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
