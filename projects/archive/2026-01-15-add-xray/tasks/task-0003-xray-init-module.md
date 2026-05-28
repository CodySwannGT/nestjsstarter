# Task: Create X-Ray initialization module

**Type:** Task
**Parent:** None

## Description

Create the core X-Ray initialization module at `src/tracing/xray.config.ts` that initializes the AWS X-Ray SDK with Lambda-appropriate settings. This module patches HTTP/HTTPS for automatic outbound request tracing and must be imported before any HTTP clients.

## Acceptance Criteria

- [ ] `src/tracing/xray.config.ts` file exists
- [ ] `initializeXRay()` function is exported
- [ ] `getXRaySegment()` function is exported
- [ ] `getXRayNamespace()` function is exported
- [ ] X-Ray is disabled when `IS_OFFLINE=true`
- [ ] HTTP/HTTPS modules are patched for automatic tracing
- [ ] Context missing strategy is set to `LOG_ERROR`
- [ ] Streaming threshold is set to 0
- [ ] Promise context propagation is enabled
- [ ] Unit tests pass with 100% coverage for graceful degradation

## Relevant Research

From brief.md (lines 99-186):
- Module must initialize X-Ray BEFORE any HTTP clients are imported
- Uses `AWSXRay.setContextMissingStrategy("LOG_ERROR")` to prevent crashes
- Uses `AWSXRay.captureHTTPsGlobal()` to patch HTTP modules
- Uses `AWSXRay.capturePromise()` for async context propagation
- Uses `AWSXRay.setStreamingThreshold(0)` for large traces

From research.md:
- Configuration pattern uses `getStandaloneConfig()` for Lambda handlers
- Uses `IS_OFFLINE` flag for local development detection (line 140)
- JSDoc conventions documented at lines 249-259

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/jsdoc-best-practices` - For proper file preamble and function documentation
- `/nestjs-rules` - For Lambda handler patterns

## Implementation Details

Create `src/tracing/xray.config.ts` with:

1. File preamble with @file, @description, @module, @remarks
2. `initializeXRay()` - Main initialization function
   - Check IS_OFFLINE environment variable
   - Set context missing strategy to LOG_ERROR
   - Patch HTTP/HTTPS modules
   - Enable Promise context propagation
   - Set streaming threshold to 0
3. `getXRaySegment()` - Get current segment with null safety
4. `getXRayNamespace()` - Get namespace for async context
5. Re-export AWSXRay for direct access

Files to create:
- `src/tracing/xray.config.ts`

## Testing Requirements

### Unit Tests
Reference: `src/database/typeorm-xray-logger.test.ts` for testing patterns

- [ ] `describe('initializeXRay')/it('should skip initialization when IS_OFFLINE is true')`: Verify no X-Ray calls in offline mode
- [ ] `describe('initializeXRay')/it('should log when initialization is skipped')`: Verify logger output
- [ ] `describe('getXRaySegment')/it('should return null when X-Ray context unavailable')`: Test graceful degradation
- [ ] `describe('getXRayNamespace')/it('should return null when X-Ray unavailable')`: Test graceful degradation

### Integration Tests
N/A - X-Ray integration requires Lambda environment

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with @file, @description, @module, @remarks
- [ ] `initializeXRay` - @description explaining Lambda context requirements
- [ ] `getXRaySegment` - @returns documenting null case
- [ ] `getXRayNamespace` - @returns documenting null case

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="xray.config.test.ts" --coverage --collectCoverageFrom='src/tracing/xray.config.ts'
```

### Expected Output
```
All tests passing with coverage for xray.config.ts
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
4. Invoke `/nestjs-rules`

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create `src/tracing/xray.config.test.ts`
2. Write tests for graceful degradation scenarios
3. Run tests to confirm they fail (file doesn't exist yet)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/tracing/xray.config.ts`
2. Implement all exported functions
3. Run tests to confirm they pass

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
