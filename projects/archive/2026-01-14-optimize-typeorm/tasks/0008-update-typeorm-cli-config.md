# Task: Update TypeORM CLI Configuration

**Type:** Task
**Parent:** None

## Description

Update the `typeorm.config.ts` file (used by TypeORM CLI for migrations) to use SnakeNamingStrategy and align with the new configuration pattern.

## Acceptance Criteria

- [ ] `typeorm.config.ts` imports and uses `SnakeNamingStrategy`
- [ ] Updates import from `database.interface` to `database.config`
- [ ] Migration generation works: `bun run migration:generate --name=Test`
- [ ] Build passes with no errors

## Relevant Research

From brief.md Task 2.3:

```typescript
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export default new DataSource({
  // ... existing config
  namingStrategy: new SnakeNamingStrategy(),
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
});
```

From research.md "typeorm.config.ts":
- CLI DataSource for migration operations
- Imports `createBaseTypeOrmConfig()` from database.interface
- Uses glob patterns for entities: `src/**/*.entity.ts`
- Uses glob patterns for migrations: `src/database/migrations/*.ts`
- Missing `SnakeNamingStrategy`

From research.md "Files to Update":
- `typeorm.config.ts:1-23` - Add `SnakeNamingStrategy`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/typeorm-patterns` - Configuration patterns, naming strategy

## Implementation Details

**Files to modify:**
- `typeorm.config.ts`

**Changes required:**
1. Add import for `SnakeNamingStrategy` from `typeorm-naming-strategies`
2. Update import from `./src/database/database.interface` to `./src/database/database.config`
3. Add `namingStrategy: new SnakeNamingStrategy()` to DataSource options
4. Use appropriate base config from new module

**Note:** The CLI config needs to remain compatible with TypeORM CLI which uses glob patterns for entities/migrations, separate from the runtime NestJS configuration.

## Testing Requirements

### Unit Tests
N/A - Configuration file, tested via CLI commands

### Integration Tests
N/A - No integration points

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Update file preamble comment if needed

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && bun run build && cat typeorm.config.ts | grep -E "SnakeNamingStrategy|namingStrategy"
```

### Expected Output
- Build passes
- File contains import of SnakeNamingStrategy
- File contains `namingStrategy: new SnakeNamingStrategy()`

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

1. Update `typeorm.config.ts`
2. Add SnakeNamingStrategy import
3. Update import path for config
4. Add namingStrategy to DataSource options

Mark "Write implementation" as completed.

### Step 3: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm SnakeNamingStrategy is properly configured
3. Run `bun run lint` to verify no ESLint errors
4. Run `bun run build` to verify no TypeScript errors

Mark "Verify implementation" as completed.

### Step 4: Update Documentation
Mark "Update documentation" as in_progress.

Update file preamble if needed.

Mark "Update documentation" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
