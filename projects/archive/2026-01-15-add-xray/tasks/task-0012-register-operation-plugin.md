# Task: Register OperationLoggingPlugin in AppModule

**Type:** Task
**Parent:** None

## Description

Add the `OperationLoggingPlugin` to the `providers` array in `src/app.module.ts` so it's automatically instantiated and registered with Apollo Server.

## Acceptance Criteria

- [ ] `OperationLoggingPlugin` is imported from `./graphql/operation-logging.plugin`
- [ ] `OperationLoggingPlugin` is added to the `providers` array
- [ ] Existing providers (`ComplexityPlugin`) remain unchanged
- [ ] TypeScript compiles without errors
- [ ] Application starts without errors

## Relevant Research

From brief.md (lines 573-586):
```typescript
import { OperationLoggingPlugin } from "./graphql/operation-logging.plugin";

@Module({
  // ...
  providers: [ComplexityPlugin, OperationLoggingPlugin],
})
export class AppModule {}
```

From research.md:
- Apollo Server configured in `src/app.module.ts` (line 99-102)
- Current providers: `[ComplexityPlugin]` (line 102)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For module configuration patterns

## Implementation Details

Modify `src/app.module.ts`:

1. Add import for `OperationLoggingPlugin`
2. Add `OperationLoggingPlugin` to `providers` array

Files to modify:
- `src/app.module.ts` - Add plugin to providers

## Testing Requirements

### Unit Tests
N/A - module configuration only

### Integration Tests
N/A - requires full NestJS context

### E2E Tests
N/A - infrastructure change

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - adding import and provider only

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q "OperationLoggingPlugin" src/app.module.ts && grep -q "operation-logging.plugin" src/app.module.ts && echo "SUCCESS: OperationLoggingPlugin registered" || echo "FAIL: Plugin not registered"
```

### Expected Output
```
SUCCESS: OperationLoggingPlugin registered
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read app.module.ts
- Add plugin registration
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/nestjs-rules`

Mark "Invoke skills" as completed.

### Step 2: Read AppModule
Mark "Read app.module.ts" as in_progress.

Read current `src/app.module.ts` to understand structure.

Mark "Read app.module.ts" as completed.

### Step 3: Add Plugin Registration
Mark "Add plugin registration" as in_progress.

1. Add import statement
2. Add plugin to providers array
3. Verify TypeScript compiles: `bun run build`

Mark "Add plugin registration" as completed.

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
