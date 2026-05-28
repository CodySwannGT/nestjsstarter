# Task: Create Database Configuration Module

**Type:** Task
**Parent:** None

## Description

Create a new `database.config.ts` module that replaces the existing `database.interface.ts`. This new module implements the typeorm-patterns skill configuration factory pattern with environment-based configuration, SnakeNamingStrategy, TypeOrmXRayLogger integration, and production replication support.

## Acceptance Criteria

- [ ] `src/database/database.config.ts` exists
- [ ] Exports `isLocalEnvironment()` helper function
- [ ] Exports `createBaseConfig()` with SnakeNamingStrategy and TypeOrmXRayLogger
- [ ] Exports `createLocalConfig()` for development
- [ ] Exports `createProductionConfig()` for replication with RDS Signer
- [ ] Exports `createTypeOrmOptions()` async factory function
- [ ] Uses `typeorm-naming-strategies` SnakeNamingStrategy
- [ ] Integrates TypeOrmXRayLogger from previous task
- [ ] Has comprehensive test coverage
- [ ] File has JSDoc preamble

## Relevant Research

From brief.md Task 2.1:

Replace `database.interface.ts` with `database.config.ts` containing:
- `isLocalEnvironment()` helper
- `createBaseConfig()` with `SnakeNamingStrategy` and `TypeOrmXRayLogger`
- `createLocalConfig()` for development
- `createProductionConfig()` for replication with RDS Signer
- `createTypeOrmOptions()` async factory function

From research.md "Environment Variables Used":

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_HOST` | `localhost` | Database host |
| `DATABASE_PORT` | `5432` | Database port |
| `DATABASE_USER` | `thumbwar` | Database username |
| `DATABASE_PASSWORD` | `thumbwar_local` | Database password |
| `DATABASE_NAME` | `thumbwar` | Database name |
| `DATABASE_SSL` | `false` | Enable SSL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | SSL certificate verification |
| `IS_OFFLINE` | - | Local development flag |
| `DATABASE_PROXY_HOST` | - | RDS Proxy endpoint |
| `DATABASE_PROXY_HOST_READ_1` | - | Read replica endpoint |

From research.md "Configuration Factory Pattern":
- `isLocalEnvironment()` - Checks `IS_OFFLINE` or `NODE_ENV === "test"`
- `createBaseConfig()` - Shared config with `SnakeNamingStrategy` and logger
- `createLocalConfig()` - Direct connection for development
- `createProductionConfig()` - Replication with RDS Signer

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD approach)
- `/typeorm-patterns` - Configuration patterns, naming strategy
- `/nestjs-rules` - NestJS patterns

## Implementation Details

**Files to create:**
- `src/database/database.config.ts`
- `src/database/database.config.test.ts`

**Function signatures:**

```typescript
export function isLocalEnvironment(): boolean

export function createBaseConfig(): Partial<DataSourceOptions>

export function createLocalConfig(): DataSourceOptions

export async function createProductionConfig(): Promise<DataSourceOptions>

export async function createTypeOrmOptions(): Promise<TypeOrmModuleOptions>
```

**Implementation requirements:**

1. `isLocalEnvironment()`:
   - Return true if `IS_OFFLINE === "true"` or `NODE_ENV === "test"`
   - Return false otherwise

2. `createBaseConfig()`:
   - Return shared config with:
     - `type: "postgres"`
     - `namingStrategy: new SnakeNamingStrategy()`
     - `logger: new TypeOrmXRayLogger()`
     - `entities: [/* imported from entities/index */]`
     - `migrations: ["src/database/migrations/*.ts"]`

3. `createLocalConfig()`:
   - Spread `createBaseConfig()`
   - Add local connection settings from env vars with defaults

4. `createProductionConfig()`:
   - Spread `createBaseConfig()`
   - Configure replication with write/read endpoints
   - Use `generateRdsAuthToken()` for password

5. `createTypeOrmOptions()`:
   - Call `isLocalEnvironment()` to determine which config to use
   - Return `createLocalConfig()` or `createProductionConfig()` accordingly
   - Add `autoLoadEntities: false` (using explicit exports)

## Testing Requirements

### Unit Tests
Test file: `src/database/database.config.test.ts`

- [ ] `describe('isLocalEnvironment')/it('should return true when IS_OFFLINE is true')`: IS_OFFLINE check
- [ ] `describe('isLocalEnvironment')/it('should return true when NODE_ENV is test')`: NODE_ENV check
- [ ] `describe('isLocalEnvironment')/it('should return false in production')`: Production check
- [ ] `describe('createBaseConfig')/it('should include SnakeNamingStrategy')`: Naming strategy included
- [ ] `describe('createBaseConfig')/it('should include TypeOrmXRayLogger')`: Logger included
- [ ] `describe('createLocalConfig')/it('should use environment variables')`: Env var reading
- [ ] `describe('createLocalConfig')/it('should use default values when env vars missing')`: Defaults work
- [ ] `describe('createProductionConfig')/it('should configure replication')`: Replication setup
- [ ] `describe('createTypeOrmOptions')/it('should return local config when IS_OFFLINE')`: Local config returned
- [ ] `describe('createTypeOrmOptions')/it('should return production config in production')`: Production config returned

### Integration Tests
N/A - Configuration module, tested via unit tests

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file`, `@description`, `@module` tags
- [ ] `isLocalEnvironment` - `@returns`, `@description`
- [ ] `createBaseConfig` - `@returns`, `@description`
- [ ] `createLocalConfig` - `@returns`, `@description`
- [ ] `createProductionConfig` - `@returns`, `@description`, `@remarks` for replication
- [ ] `createTypeOrmOptions` - `@returns`, `@description`

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && bun run test -- --testPathPattern="database.config" --coverage --collectCoverageFrom='src/database/database.config.ts'
```

### Expected Output
- All tests pass
- Coverage report shows high coverage for database.config.ts

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
3. Invoke `/typeorm-patterns` skill
4. Invoke `/nestjs-rules` skill

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create `src/database/database.config.test.ts`
2. Write tests for all acceptance criteria
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/database/database.config.ts`
2. Implement all exported functions
3. Run tests until all pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm all tests pass with good coverage
3. Run `bun run lint` to verify no ESLint errors

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Complete all JSDoc requirements listed in Documentation Requirements.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
