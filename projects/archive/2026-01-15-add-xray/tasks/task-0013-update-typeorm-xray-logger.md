# Task: Update TypeORM X-Ray logger to use shared tracing module

**Type:** Task
**Parent:** None

## Description

Update `src/database/typeorm-xray-logger.ts` to use the shared tracing module functions instead of dynamic `require()`. This ensures consistent X-Ray initialization and removes the duplicate code for getting X-Ray namespace/segment.

## Acceptance Criteria

- [ ] Import `getXRaySegment` from `../tracing`
- [ ] Import `getXRayNamespace` from `../tracing`
- [ ] Remove dynamic `require("aws-xray-sdk-core")` call
- [ ] Remove local `getXRayNamespace()` function
- [ ] Update `createSubsegment()` to use imported `getXRaySegment()`
- [ ] Existing functionality unchanged
- [ ] Existing tests still pass
- [ ] TypeScript compiles without errors

## Relevant Research

From brief.md (lines 643-660):
```typescript
// Replace the getXRayNamespace function
import { getXRayNamespace, getXRaySegment } from "../tracing";

// Remove the dynamic require and use the imported functions
private createSubsegment(name: string): XRaySubsegment | null {
  try {
    const segment = getXRaySegment();
    return segment?.addNewSubsegment(name) ?? null;
  } catch {
    return null;
  }
}
```

From research.md:
- Current implementation uses dynamic `require("aws-xray-sdk-core")` (line 29)
- Already integrated in `database.config.ts:91` (line 35-38)
- Has existing tests at `typeorm-xray-logger.test.ts` (line 218)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/typeorm-patterns` - For TypeORM observability patterns

## Implementation Details

Modify `src/database/typeorm-xray-logger.ts`:

1. Add imports from `../tracing`
2. Remove the `getXRayNamespace()` function that does dynamic require
3. Update `createSubsegment()` method to use `getXRaySegment()`
4. Keep all other functionality unchanged

Files to modify:
- `src/database/typeorm-xray-logger.ts`

## Testing Requirements

### Unit Tests
Existing tests should continue to pass - no new tests needed

- [ ] Run existing `typeorm-xray-logger.test.ts` and verify all pass

### Integration Tests
N/A - no new integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - only changing implementation details, not interface

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="typeorm-xray-logger.test.ts" && grep -q 'from "../tracing"' src/database/typeorm-xray-logger.ts && echo "SUCCESS: TypeORM logger updated" || echo "FAIL: Update incomplete"
```

### Expected Output
```
All tests passing
SUCCESS: TypeORM logger updated
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read typeorm-xray-logger.ts
- Update imports
- Run existing tests
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/typeorm-patterns`

Mark "Invoke skills" as completed.

### Step 2: Read Logger
Mark "Read typeorm-xray-logger.ts" as in_progress.

Read current implementation to understand structure.

Mark "Read typeorm-xray-logger.ts" as completed.

### Step 3: Update Imports
Mark "Update imports" as in_progress.

1. Add imports from `../tracing`
2. Remove dynamic require function
3. Update `createSubsegment()` to use imported `getXRaySegment()`

Mark "Update imports" as completed.

### Step 4: Run Existing Tests
Mark "Run existing tests" as in_progress.

Run `bun run test -- --testPathPattern="typeorm-xray-logger.test.ts"` and verify all pass.

Mark "Run existing tests" as completed.

### Step 5: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
