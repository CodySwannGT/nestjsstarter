# Task: Create TimestampedEntity Abstract Base Class

**Type:** Task
**Parent:** None

## Description

Create an abstract base entity class that provides common timestamp fields (`id`, `createdAt`, `updatedAt`) for all future entities. This follows the typeorm-patterns skill requirements for entity infrastructure.

## Acceptance Criteria

- [ ] `src/database/entities/timestamped.entity.ts` exists
- [ ] Class is abstract (cannot be instantiated directly)
- [ ] Class does NOT have `@Entity()` decorator (abstract classes should not be entities)
- [ ] Has UUID primary key with `@PrimaryGeneratedColumn("uuid")`
- [ ] Has `createdAt` with `@CreateDateColumn`
- [ ] Has `updatedAt` with `@UpdateDateColumn`
- [ ] All columns have `comment` property for documentation
- [ ] File has JSDoc preamble
- [ ] All tests pass

## Relevant Research

From brief.md Task 4.1:

```typescript
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class TimestampedEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "Unique identifier (UUID v4)" })
  id: string;

  @CreateDateColumn({ comment: "Timestamp when record was created" })
  createdAt: Date;

  @UpdateDateColumn({ comment: "Timestamp when record was last updated" })
  updatedAt: Date;
}
```

From research.md "Entity directory" section:
- Currently contains only `.keep` placeholder file
- No `TimestampedEntity` abstract base class exists yet

From typeorm-patterns skill:
- All columns require `comment` property
- Abstract base entities should NOT have `@Entity()` decorator

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD, immutability)
- `/typeorm-patterns` - Entity patterns, comments requirement
- `/nestjs-rules` - Module structure conventions

## Implementation Details

**Files to create:**
- `src/database/entities/timestamped.entity.ts`

**Implementation requirements:**
1. Import decorators from `typeorm`
2. Create abstract class `TimestampedEntity`
3. Add `id` field with UUID generation and comment
4. Add `createdAt` field with CreateDateColumn and comment
5. Add `updatedAt` field with UpdateDateColumn and comment
6. Add JSDoc file preamble

**Important notes:**
- Do NOT add `@Entity()` decorator - abstract classes should not be entities
- All comments must describe the field purpose

## Testing Requirements

### Unit Tests
N/A - Abstract class with decorators only, no logic to test. TypeORM decorators are tested by TypeORM itself.

### Integration Tests
N/A - Will be tested when concrete entities extend this class

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file`, `@description`, `@module` tags
- [ ] `TimestampedEntity` class with `@description` and `@abstract` tags

### Database Comments
- [ ] `id` column - "Unique identifier (UUID v4)"
- [ ] `createdAt` column - "Timestamp when record was created"
- [ ] `updatedAt` column - "Timestamp when record was last updated"

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && cat src/database/entities/timestamped.entity.ts && bun run build
```

### Expected Output
- File contents showing abstract class with three decorated fields
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
4. Invoke `/nestjs-rules` skill

Mark "Invoke skills" as completed.

### Step 2: Write Implementation
Mark "Write implementation" as in_progress.

Create the timestamped.entity.ts file with:
- JSDoc file preamble
- Abstract class with three decorated fields
- Comments on all columns

Mark "Write implementation" as completed.

### Step 3: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run `bun run build` to verify no TypeScript errors
2. Run `bun run lint` to verify no ESLint errors
3. Confirm file structure matches acceptance criteria

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
