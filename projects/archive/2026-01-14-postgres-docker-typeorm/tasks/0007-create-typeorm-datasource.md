# Task: Create TypeORM CLI data source configuration

**Type:** Task
**Parent:** None

## Description

Create a TypeORM DataSource configuration file at the project root for use with the TypeORM CLI. This configuration enables running migrations from the command line.

## Acceptance Criteria

- [ ] `typeorm.config.ts` file created at project root
- [ ] DataSource configured for PostgreSQL
- [ ] Reads connection settings from environment variables
- [ ] Entity path configured to find all `.entity.ts` files
- [ ] Migration path configured to `src/database/migrations/`
- [ ] Configuration uses `ts-node` compatible setup

## Relevant Research

**Migration Script Runtime** (research.md, Q4 Answer):
- Use ts-node (not tsx) for TypeScript execution

**Configuration example** (brief.md):
```typescript
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'thumbwar',
  password: process.env.DATABASE_PASSWORD ?? 'thumbwar_local',
  database: process.env.DATABASE_NAME ?? 'thumbwar',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
```

**Reference files**:
- `src/database/database.interface.ts` (for default constants)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to create**: `typeorm.config.ts`

**Configuration structure**:
```typescript
/**
 * @file typeorm.config.ts
 * @description TypeORM CLI DataSource configuration for migrations
 * @module database
 */
import { DataSource } from "typeorm";
import {
  DEFAULT_DATABASE_HOST,
  DEFAULT_DATABASE_NAME,
  DEFAULT_DATABASE_PASSWORD,
  DEFAULT_DATABASE_PORT,
  DEFAULT_DATABASE_USER,
} from "./src/database/database.interface";

/**
 * TypeORM DataSource for CLI operations
 * @description Used by TypeORM CLI for running migrations
 * @remarks
 * - This file is used by typeorm-ts-node-commonjs CLI
 * - Reads environment variables with fallback to defaults
 * - Entities and migrations paths relative to project root
 */
export default new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? DEFAULT_DATABASE_HOST,
  port: parseInt(
    process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT),
    10
  ),
  username: process.env.DATABASE_USER ?? DEFAULT_DATABASE_USER,
  password: process.env.DATABASE_PASSWORD ?? DEFAULT_DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? DEFAULT_DATABASE_NAME,
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
```

## Testing Requirements

### Unit Tests
N/A - CLI configuration file, tested via CLI commands

### Integration Tests
N/A - Integration testing via migration commands

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File header with `@file`, `@description`, `@module`
- [ ] DataSource export with `@description` and `@remarks`

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
test -f typeorm.config.ts && bun run build && echo "TypeORM config created and compiles"
```

### Expected Output
```text
TypeORM config created and compiles
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
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

N/A - CLI configuration task, no unit tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `typeorm.config.ts` at project root
2. Import constants from database.interface.ts
3. Configure DataSource with environment variable fallbacks
4. Run TypeScript compilation to verify

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm file exists and TypeScript compiles
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Verify all JSDoc documentation is in place per Documentation Requirements.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
