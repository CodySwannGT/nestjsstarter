# Task: Update Database Module with dataSourceFactory

**Type:** Task
**Parent:** None

## Description

Update the `database.module.ts` to use the new `dataSourceFactory` pattern from the typeorm-patterns skill. This gives full control over DataSource initialization and enables the new configuration from `database.config.ts`.

## Acceptance Criteria

- [ ] `src/database/database.module.ts` uses `dataSourceFactory` in `forRootAsync`
- [ ] Imports `createTypeOrmOptions` from `./database.config`
- [ ] Removes `@Global()` decorator (not needed with TypeOrmModule)
- [ ] DataSource is initialized via `dataSourceFactory`
- [ ] Tests updated for new module structure
- [ ] Build and tests pass

## Relevant Research

From brief.md Task 2.2:

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error("DataSource options are required");
        }
        const dataSource = new DataSource(options as DataSourceOptions);
        return dataSource.initialize();
      },
    }),
  ],
})
export class DatabaseModule {}
```

Changes:
- Remove `@Global()` decorator (not needed with TypeOrmModule)
- Remove `createTypeOrmConfig()` function (moved to database.config.ts)
- Add `dataSourceFactory` to forRootAsync
- Import from `./database.config`

From research.md "Current database.module.ts":
```typescript
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmConfig,
    }),
  ],
})
export class DatabaseModule {}
```

From research.md "TypeORM Integration Pattern":
- Skill recommends removing `@Global()` since `TypeOrmModule` handles injection automatically
- `dataSourceFactory` provides full control over DataSource initialization

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD approach)
- `/typeorm-patterns` - dataSourceFactory pattern
- `/nestjs-rules` - Module structure conventions

## Implementation Details

**Files to modify:**
- `src/database/database.module.ts`
- `src/database/database.module.test.ts`

**Changes to database.module.ts:**
1. Remove `@Global()` decorator
2. Remove import of `createTypeOrmConfig` from `./database.interface`
3. Add import of `createTypeOrmOptions` from `./database.config`
4. Add import of `DataSource`, `DataSourceOptions` from `typeorm`
5. Add `dataSourceFactory` to `forRootAsync` options

**Changes to database.module.test.ts:**
1. Update mocks to reference `./database.config` instead of `./database.interface`
2. Test that `dataSourceFactory` is passed to `forRootAsync`
3. Remove tests for deleted `createTypeOrmConfig`

## Testing Requirements

### Unit Tests
Update existing test file: `src/database/database.module.test.ts`

- [ ] `describe('DatabaseModule')/it('should pass createTypeOrmOptions to forRootAsync')`: Factory function passed
- [ ] `describe('DatabaseModule')/it('should pass dataSourceFactory to forRootAsync')`: dataSourceFactory passed
- [ ] `describe('DatabaseModule')/it('should not use @Global decorator')`: Module is not global

### Integration Tests
N/A - Module structure tested via unit tests

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Update file preamble if needed
- [ ] Update class documentation if needed

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && bun run test -- --testPathPattern="database.module" --coverage --collectCoverageFrom='src/database/database.module.ts'
```

### Expected Output
- All tests pass
- Coverage report shows coverage for database.module.ts

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

1. Update `src/database/database.module.test.ts`
2. Update mocks to reference new config module
3. Add tests for new acceptance criteria
4. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Update `src/database/database.module.ts`
2. Remove `@Global()` decorator
3. Update imports to use `database.config`
4. Add `dataSourceFactory` to `forRootAsync`
5. Run tests until all pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm all tests pass
3. Run `bun run lint` to verify no ESLint errors
4. Run `bun run build` to verify no TypeScript errors

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Update JSDoc if any changes needed.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
