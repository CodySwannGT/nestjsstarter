# Task: Add migration npm scripts to package.json

**Type:** Task
**Parent:** 0007-create-typeorm-datasource

## Description

Add TypeORM migration scripts to package.json for generating, running, and reverting database migrations using the TypeORM CLI.

## Acceptance Criteria

- [ ] `migration:generate` script added for generating new migrations
- [ ] `migration:run` script added for applying migrations
- [ ] `migration:revert` script added for reverting migrations
- [ ] Scripts use `typeorm-ts-node-commonjs` for TypeScript support
- [ ] Scripts reference `typeorm.config.ts` data source

## Relevant Research

**Migration scripts** (brief.md):
```json
{
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d typeorm.config.ts",
  "migration:run": "typeorm-ts-node-commonjs migration:run -d typeorm.config.ts",
  "migration:revert": "typeorm-ts-node-commonjs migration:revert -d typeorm.config.ts"
}
```

**Migration Script Runtime** (research.md, Q4 Answer):
- Use ts-node for TypeScript execution

**TypeORM CLI Documentation** (research.md external resources):
- TypeORM CLI requires DataSource file path via `-d` flag
- `migration:generate` takes migration name as argument
- Uses `typeorm-ts-node-commonjs` for CommonJS compatibility

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to modify**: `package.json`

**Scripts to add** (in scripts section):
```json
{
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d typeorm.config.ts src/database/migrations/$npm_config_name",
  "migration:run": "typeorm-ts-node-commonjs migration:run -d typeorm.config.ts",
  "migration:revert": "typeorm-ts-node-commonjs migration:revert -d typeorm.config.ts"
}
```

**Usage**:
- Generate: `bun run migration:generate --name=CreateUsersTable`
- Run: `bun run migration:run`
- Revert: `bun run migration:revert`

## Testing Requirements

### Unit Tests
N/A - npm script configuration, no unit tests required

### Integration Tests
N/A - Script testing will be done manually

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - package.json scripts

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q '"migration:generate"' package.json && grep -q '"migration:run"' package.json && grep -q '"migration:revert"' package.json && echo "Migration scripts added"
```

### Expected Output
```text
Migration scripts added
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

N/A - npm script configuration task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read `package.json`
2. Add migration scripts to scripts section
3. Save file

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm all three scripts are present
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - No documentation requirements for this task.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
