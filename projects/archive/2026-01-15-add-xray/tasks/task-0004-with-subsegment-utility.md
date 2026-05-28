# Task: Create withXRaySubsegment utility function

**Type:** Task
**Parent:** None

## Description

Create a utility function `withXRaySubsegment` that wraps async operations with X-Ray tracing. This function provides a simple, consistent way to trace custom operations while handling graceful degradation when X-Ray context is unavailable.

## Acceptance Criteria

- [ ] `src/tracing/with-subsegment.ts` file exists
- [ ] `withXRaySubsegment<T>()` function is exported
- [ ] `SubsegmentOptions` interface is exported
- [ ] Supports annotations (indexed, searchable)
- [ ] Supports metadata (not indexed, for debugging)
- [ ] Executes function normally when X-Ray unavailable
- [ ] Records errors on the subsegment when function throws
- [ ] Closes subsegment in finally block
- [ ] Unit tests pass with 100% coverage

## Relevant Research

From brief.md (lines 188-319):
- Function signature: `withXRaySubsegment<T>(name: string, fn: () => Promise<T>, options?: SubsegmentOptions)`
- Options include `annotations` (Record<string, string | number | boolean>) and `metadata` (Record<string, unknown>)
- Must use `namespace.runAndReturn()` for proper context propagation
- Must handle errors with `subsegment.addError()`
- Must close subsegment in finally block with `isClosed()` check

From research.md:
- Pattern follows existing `typeorm-xray-logger.ts` graceful degradation
- Test strategy: Test fallback behavior, do NOT mock X-Ray SDK (line 245)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/jsdoc-best-practices` - For proper documentation with examples

## Implementation Details

Create `src/tracing/with-subsegment.ts` with:

1. File preamble with @file, @description, @module, @remarks
2. `SubsegmentOptions` interface documenting annotations vs metadata
3. `withXRaySubsegment<T>()` function that:
   - Gets X-Ray namespace, returns fn() if unavailable
   - Uses `namespace.runAndReturn()` for context propagation
   - Gets segment, returns fn() if unavailable
   - Creates subsegment with given name
   - Adds annotations (searchable)
   - Adds metadata (debugging)
   - Records errors if fn throws
   - Closes subsegment in finally block

Files to create:
- `src/tracing/with-subsegment.ts`

## Testing Requirements

### Unit Tests
- [ ] `describe('withXRaySubsegment')/it('should execute function and return result when X-Ray unavailable')`: Test graceful degradation
- [ ] `describe('withXRaySubsegment')/it('should propagate errors from wrapped function')`: Ensure errors aren't swallowed
- [ ] `describe('withXRaySubsegment')/it('should work with async functions')`: Test async/await pattern

### Integration Tests
N/A - X-Ray integration requires Lambda environment

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with @file, @description, @module, @remarks
- [ ] `SubsegmentOptions` - @description explaining annotations vs metadata with max limits
- [ ] `withXRaySubsegment` - @description, @param for each parameter, @returns, @example with real use case

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="with-subsegment.test.ts" --coverage --collectCoverageFrom='src/tracing/with-subsegment.ts'
```

### Expected Output
```
All tests passing with coverage for with-subsegment.ts
```

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
2. Invoke `/coding-philosophy`
3. Invoke `/jsdoc-best-practices`

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create `src/tracing/with-subsegment.test.ts`
2. Write tests for graceful degradation and error propagation
3. Run tests to confirm they fail (file doesn't exist yet)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/tracing/with-subsegment.ts`
2. Implement `SubsegmentOptions` interface
3. Implement `withXRaySubsegment` function
4. Run tests to confirm they pass

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
