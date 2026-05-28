# Task: Create Entities Index File

**Type:** Task
**Parent:** None

## Description

Create a centralized index.ts file in the entities directory that exports all entity classes. This follows the typeorm-patterns skill requirement for explicit entity exports rather than using glob patterns with `autoLoadEntities`.

## Acceptance Criteria

- [ ] `src/database/entities/index.ts` exists
- [ ] Exports `TimestampedEntity` from `./timestamped.entity`
- [ ] File has JSDoc preamble
- [ ] Build passes with no errors

## Relevant Research

From brief.md Task 4.2:

```typescript
export { TimestampedEntity } from "./timestamped.entity";
// Future entities will be added here
```

From research.md:
- Skill requires explicit entity exports via `index.ts`
- Currently uses `autoLoadEntities: true` (to be changed in later task)

From typeorm-patterns skill:
- All entities must be explicitly exported from entities/index.ts
- Glob patterns for entity loading should be avoided

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/typeorm-patterns` - Entity export patterns

## Implementation Details

**Files to create:**
- `src/database/entities/index.ts`

**Implementation requirements:**
1. Export `TimestampedEntity` from `./timestamped.entity`
2. Add comment indicating where future entities should be added
3. Add JSDoc file preamble

## Testing Requirements

### Unit Tests
N/A - Re-export file only, no logic to test

### Integration Tests
N/A - No integration points

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file`, `@description`, `@module` tags

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && cat src/database/entities/index.ts && bun run build
```

### Expected Output
- File contents showing TimestampedEntity export
- Build completes successfully with no TypeScript errors

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy` skill
3. Invoke `/typeorm-patterns` skill

Mark "Invoke skills" as completed.

### Step 2: Write Implementation
Mark "Write implementation" as in_progress.

Create the index.ts file with:
- JSDoc file preamble
- Export statement for TimestampedEntity

Mark "Write implementation" as completed.

### Step 3: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run `bun run build` to verify no TypeScript errors
2. Run `bun run lint` to verify no ESLint errors

Mark "Verify implementation" as completed.

### Step 4: Update Documentation
Mark "Update documentation" as in_progress.

JSDoc is included in implementation. No additional documentation needed.

Mark "Update documentation" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
