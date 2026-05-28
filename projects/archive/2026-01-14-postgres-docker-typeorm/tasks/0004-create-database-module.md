# Task: Create DatabaseModule with TypeORM configuration

**Type:** Task
**Parent:** 0003-create-database-interface

## Description

Create the DatabaseModule following the ValkeyModule pattern. This module will configure TypeORM with PostgreSQL using async factory configuration, reading connection settings from environment variables.

## Acceptance Criteria

- [ ] `database.module.ts` file created in `src/database/` directory
- [ ] Module uses `@Global()` decorator for app-wide availability
- [ ] Uses `TypeOrmModule.forRootAsync()` for async configuration
- [ ] Configuration reads from environment variables with defaults from interface
- [ ] SSL configuration supports Aurora Serverless
- [ ] `autoLoadEntities: true` for automatic entity registration
- [ ] `synchronize: false` to prevent automatic schema changes
- [ ] Unit tests written for module configuration

## Relevant Research

**ValkeyModule Reference Pattern** (research.md, `valkey.module.ts:1-22`):
- Uses `@Global()` decorator
- Simple module declaration with `providers` and `exports`
- Configuration built in private method

**Module Configuration** (brief.md):
```typescript
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER ?? 'thumbwar',
        password: process.env.DATABASE_PASSWORD ?? 'thumbwar_local',
        database: process.env.DATABASE_NAME ?? 'thumbwar',
        entities: [],
        synchronize: false,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
```

**Entity Registration Strategy** (research.md, Q3 Answer):
- Use `autoLoadEntities: true` for simpler entity registration

**Reference files**:
- `src/valkey/valkey.module.ts`
- `src/valkey/valkey.service.ts`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to create**: `src/database/database.module.ts`

**Module structure**:
```typescript
/**
 * @file database.module.ts
 * @description Global database module for PostgreSQL/TypeORM configuration
 * @module database
 */
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DEFAULT_DATABASE_HOST,
  DEFAULT_DATABASE_NAME,
  DEFAULT_DATABASE_PASSWORD,
  DEFAULT_DATABASE_PORT,
  DEFAULT_DATABASE_SSL,
  DEFAULT_DATABASE_USER,
} from "./database.interface";

/**
 * Global database module
 * @description Configures TypeORM with PostgreSQL for the application
 * @remarks
 * - Uses async factory for environment-based configuration
 * - Supports SSL for Aurora Serverless in production
 * - Auto-loads entities from feature modules
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres" as const,
        host: process.env.DATABASE_HOST ?? DEFAULT_DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT), 10),
        username: process.env.DATABASE_USER ?? DEFAULT_DATABASE_USER,
        password: process.env.DATABASE_PASSWORD ?? DEFAULT_DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME ?? DEFAULT_DATABASE_NAME,
        autoLoadEntities: true,
        synchronize: false,
        ssl: process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : DEFAULT_DATABASE_SSL,
      }),
    }),
  ],
})
export class DatabaseModule {}
```

## Testing Requirements

### Unit Tests
Reference pattern from `valkey.service.test.ts`.

- [ ] `describe('DatabaseModule')/it('should be defined')`: Verify module compiles
- [ ] `describe('DatabaseModule')/it('should configure TypeORM with default values')`: Verify default configuration
- [ ] `describe('DatabaseModule')/it('should read configuration from environment')`: Verify env vars override defaults

### Integration Tests
N/A - Integration testing will be covered by later health check task

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File header with `@file`, `@description`, `@module`
- [ ] `DatabaseModule` class with `@description` and `@remarks`

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="database.module" --passWithNoTests
```

### Expected Output
Tests should pass with module properly configured.

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

1. Create `src/database/database.module.test.ts`
2. Write tests for module definition and configuration
3. Run tests to confirm they fail (module not found)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `database.module.ts` with TypeORM configuration
2. Use constants from `database.interface.ts`
3. Run tests to confirm they pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output shows tests passing
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
