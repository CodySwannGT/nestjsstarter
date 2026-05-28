# Task: Create database configuration interface

**Type:** Task
**Parent:** None

## Description

Create a TypeScript interface file for database configuration following the established pattern from `valkey.interface.ts`. This interface will define the shape of database connection configuration used throughout the application.

## Acceptance Criteria

- [ ] `database.interface.ts` file created in `src/database/` directory
- [ ] `DatabaseConfig` interface defined with all connection properties
- [ ] Default value constants defined
- [ ] JSDoc documentation for all types and constants
- [ ] Unit tests written for interface validation

## Relevant Research

**Interface Pattern** (research.md, `valkey.interface.ts:1-110`):
- Separate interface file for type definitions
- Constants for default values
- JSDoc documentation for all types and constants

**Environment Variable Pattern** (research.md):
- `DATABASE_HOST` (default: `localhost`)
- `DATABASE_PORT` (default: `5432`)
- `DATABASE_USER` (default: `thumbwar`)
- `DATABASE_PASSWORD` (default: `thumbwar_local`)
- `DATABASE_NAME` (default: `thumbwar`)
- `DATABASE_SSL` (default: `false`, set `true` for production)

**Reference file**: `src/valkey/valkey.interface.ts`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to create**: `src/database/database.interface.ts`

**Interface structure**:
```typescript
/**
 * @file database.interface.ts
 * @description Database configuration types and constants
 * @module database
 */

/**
 * Database connection configuration
 * @description Configuration options for PostgreSQL database connection
 */
export interface DatabaseConfig {
  /** Database host address */
  readonly host: string;
  /** Database port number */
  readonly port: number;
  /** Database username */
  readonly username: string;
  /** Database password */
  readonly password: string;
  /** Database name */
  readonly database: string;
  /** Enable SSL connection */
  readonly ssl: boolean;
}

/** Default database host for local development */
export const DEFAULT_DATABASE_HOST = "localhost";

/** Default database port for PostgreSQL */
export const DEFAULT_DATABASE_PORT = 5432;

/** Default database username for local development */
export const DEFAULT_DATABASE_USER = "thumbwar";

/** Default database password for local development */
export const DEFAULT_DATABASE_PASSWORD = "thumbwar_local";

/** Default database name */
export const DEFAULT_DATABASE_NAME = "thumbwar";

/** Default SSL setting (disabled for local development) */
export const DEFAULT_DATABASE_SSL = false;
```

## Testing Requirements

### Unit Tests
Reference pattern from research.md testing section.

- [ ] `describe('DatabaseConfig interface')/it('should define all required properties')`: Verify interface has correct shape
- [ ] `describe('Database constants')/it('should export correct default values')`: Verify each constant has expected value

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File header with `@file`, `@description`, `@module`
- [ ] `DatabaseConfig` interface with `@description`
- [ ] Each interface property with inline JSDoc comment
- [ ] Each constant with JSDoc description

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="database.interface" --passWithNoTests
```

### Expected Output
Tests should pass with all interface validations confirmed.

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

1. Create `src/database/database.interface.test.ts`
2. Write tests that verify interface shape and constant values
3. Run tests to confirm they fail (module not found)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/database/` directory
2. Create `database.interface.ts` with interface and constants
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
