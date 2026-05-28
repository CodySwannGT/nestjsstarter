# Task: Create tracing module barrel export

**Type:** Task
**Parent:** None

## Description

Create the barrel export file `src/tracing/index.ts` that re-exports all tracing utilities from a single entry point. This follows the NestJS module pattern and provides a clean import interface.

## Acceptance Criteria

- [ ] `src/tracing/index.ts` file exists
- [ ] Exports `initializeXRay` from `./xray.config`
- [ ] Exports `getXRaySegment` from `./xray.config`
- [ ] Exports `getXRayNamespace` from `./xray.config`
- [ ] Exports `AWSXRay` from `./xray.config`
- [ ] Exports `withXRaySubsegment` from `./with-subsegment`
- [ ] File has proper JSDoc preamble

## Relevant Research

From brief.md (lines 322-335):
```typescript
export { initializeXRay, getXRaySegment, getXRayNamespace, AWSXRay } from "./xray.config";
export { withXRaySubsegment } from "./with-subsegment";
```

From research.md:
- Pattern follows existing barrel exports in codebase
- JSDoc conventions require file preamble (line 249-259)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/jsdoc-best-practices` - For file preamble

## Implementation Details

Create `src/tracing/index.ts` with:

1. File preamble with @file, @description, @module
2. Named exports from `./xray.config`
3. Named exports from `./with-subsegment`

Files to create:
- `src/tracing/index.ts`

## Testing Requirements

### Unit Tests
N/A - barrel export only, no logic to test

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with @file, @description, @module

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
test -f src/tracing/index.ts && grep -q "initializeXRay" src/tracing/index.ts && grep -q "withXRaySubsegment" src/tracing/index.ts && echo "SUCCESS: Barrel export complete" || echo "FAIL: Missing exports"
```

### Expected Output
```
SUCCESS: Barrel export complete
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write barrel export
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/jsdoc-best-practices`

Mark "Invoke skills" as completed.

### Step 2: Write Barrel Export
Mark "Write barrel export" as in_progress.

Create `src/tracing/index.ts` with all exports.

Mark "Write barrel export" as completed.

### Step 3: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output

Mark "Verify implementation" as completed.

### Step 4: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
