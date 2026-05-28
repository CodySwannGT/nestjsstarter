# Task: Add X-Ray initialization to main Lambda handler

**Type:** Task
**Parent:** None

## Description

Update `src/main.ts` to initialize X-Ray before any other imports. This is critical because HTTP/HTTPS patching must occur before any HTTP clients are loaded to ensure automatic outbound request tracing.

## Acceptance Criteria

- [ ] X-Ray import is the FIRST import in the file
- [ ] `initializeXRay()` is called immediately after import
- [ ] Import is from `./tracing` (not `./tracing/xray.config`)
- [ ] Existing functionality unchanged
- [ ] No lint errors
- [ ] TypeScript compiles without errors

## Relevant Research

From brief.md (lines 337-360):
```typescript
// CRITICAL: Initialize X-Ray FIRST, before any other imports that use HTTP
import { initializeXRay } from "./tracing";
initializeXRay();

import { NestFactory } from "@nestjs/core";
// ... rest of imports
```

From research.md:
- Main Lambda handler uses `@vendia/serverless-express` (line 43-44)
- Implements warm start caching pattern
- Currently has NO X-Ray initialization

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For Lambda handler patterns

## Implementation Details

Modify `src/main.ts`:

1. Add X-Ray import as the VERY FIRST line (before any other imports)
2. Call `initializeXRay()` immediately after the import
3. Keep all other imports and code unchanged

Files to modify:
- `src/main.ts` - Add X-Ray initialization at top

## Testing Requirements

### Unit Tests
N/A - Lambda handler integration, tested via manual deployment

### Integration Tests
N/A - requires Lambda environment

### E2E Tests
N/A - infrastructure change

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - adding import only, existing preamble remains

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
head -5 src/main.ts | grep -q "import.*initializeXRay.*from.*tracing" && head -5 src/main.ts | grep -q "initializeXRay()" && echo "SUCCESS: X-Ray initialized in main.ts" || echo "FAIL: X-Ray not initialized"
```

### Expected Output
```
SUCCESS: X-Ray initialized in main.ts
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read main.ts
- Add X-Ray initialization
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/nestjs-rules`

Mark "Invoke skills" as completed.

### Step 2: Read main.ts
Mark "Read main.ts" as in_progress.

Read current `src/main.ts` to understand structure.

Mark "Read main.ts" as completed.

### Step 3: Add X-Ray Initialization
Mark "Add X-Ray initialization" as in_progress.

1. Add X-Ray import as first line
2. Call `initializeXRay()` immediately after
3. Verify TypeScript compiles: `bun run build`

Mark "Add X-Ray initialization" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output

Mark "Verify implementation" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
