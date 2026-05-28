# TypeORM Optimization Plan

Align the current TypeORM implementation with the patterns defined in `.claude/skills/typeorm-patterns/SKILL.md`.

## Current State

| File | Status | Issues |
|------|--------|--------|
| `src/database/database.module.ts` | Needs update | Missing `dataSourceFactory`, uses `autoLoadEntities` |
| `src/database/database.interface.ts` | Needs refactor | No naming strategy, no replication, no logger |
| `typeorm.config.ts` | Needs update | Missing `SnakeNamingStrategy` |
| `src/database/entities/` | Empty | Missing `TimestampedEntity`, missing `index.ts` |
| X-Ray logger | Missing | Need to create `typeorm-xray-logger.ts` |
| RDS Signer | Missing | Need to create `rds-signer.ts` for production |

## Target State

Per skill requirements:
- `TypeOrmModule.forRootAsync()` with `dataSourceFactory`
- `SnakeNamingStrategy` for consistent naming
- Explicit entity exports via `index.ts`
- `TimestampedEntity` abstract base class
- `TypeOrmXRayLogger` with graceful local fallback
- Production replication with AWS RDS Signer

## Implementation Tasks

### Phase 1: Dependencies

#### Task 1.1: Install required packages

```bash
bun add typeorm-naming-strategies
bun add -d @aws-sdk/rds-signer
```

**Files:** `package.json`

### Phase 2: Configuration Refactor

#### Task 2.1: Create database.config.ts

Replace `database.interface.ts` with `database.config.ts` containing:
- `isLocalEnvironment()` helper
- `createBaseConfig()` with `SnakeNamingStrategy` and `TypeOrmXRayLogger`
- `createLocalConfig()` for development
- `createProductionConfig()` for replication with RDS Signer
- `createTypeOrmOptions()` async factory function

**Files:**
- Create: `src/database/database.config.ts`
- Delete: `src/database/database.interface.ts`
- Delete: `src/database/database.interface.test.ts`

#### Task 2.2: Update database.module.ts

Update to use `dataSourceFactory`:

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

**Files:**
- Update: `src/database/database.module.ts`
- Update: `src/database/database.module.test.ts`

#### Task 2.3: Update typeorm.config.ts (CLI)

Add `SnakeNamingStrategy`:

```typescript
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export default new DataSource({
  // ... existing config
  namingStrategy: new SnakeNamingStrategy(),
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
});
```

**Files:** `typeorm.config.ts`

### Phase 3: Observability

#### Task 3.1: Create TypeOrmXRayLogger

Create custom logger with:
- AWS X-Ray subsegment creation per query
- Graceful degradation when X-Ray SDK unavailable (local dev)
- Query type extraction (SELECT/INSERT/UPDATE/DELETE)
- Table name extraction
- Parameter sanitization (no sensitive data logged)
- Defensive programming (never throws)

**Files:**
- Create: `src/database/typeorm-xray-logger.ts`
- Create: `src/database/typeorm-xray-logger.test.ts`

#### Task 3.2: Create RDS Signer utility

Create utility for production IAM authentication:
- `generateRdsAuthToken(hostname, port, username)` function
- Uses `@aws-sdk/rds-signer`
- Returns temporary auth token (15 min validity)

**Files:**
- Create: `src/database/rds-signer.ts`
- Create: `src/database/rds-signer.test.ts`

### Phase 4: Entity Infrastructure

#### Task 4.1: Create TimestampedEntity

Create abstract base entity:

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

**Note:** NO `@Entity()` decorator on abstract class.

**Files:**
- Create: `src/database/entities/timestamped.entity.ts`
- Delete: `src/database/entities/.keep`

#### Task 4.2: Create entities/index.ts

Create centralized entity exports:

```typescript
export { TimestampedEntity } from "./timestamped.entity";
// Future entities will be added here
```

**Files:**
- Create: `src/database/entities/index.ts`

### Phase 5: Test Updates

#### Task 5.1: Create database.config.test.ts

Test coverage for:
- `isLocalEnvironment()` with various env combinations
- `createLocalConfig()` with default and custom env vars
- `createProductionConfig()` replication structure
- `createTypeOrmOptions()` returns correct config per environment

**Files:**
- Create: `src/database/database.config.test.ts`

#### Task 5.2: Update database.module.test.ts

Update tests for new module structure:
- Mock `createTypeOrmOptions` from database.config
- Test `dataSourceFactory` is called
- Remove tests for deleted `createTypeOrmConfig`

**Files:**
- Update: `src/database/database.module.test.ts`

### Phase 6: Cleanup

#### Task 6.1: Remove deprecated files

- Delete `src/database/database.interface.ts`
- Delete `src/database/database.interface.test.ts`
- Delete `src/database/entities/.keep`
- Delete `src/database/migrations/.keep` (if empty after setup)

#### Task 6.2: Update imports

Search and update any imports of:
- `database.interface` → `database.config`
- `createBaseTypeOrmConfig` → appropriate new function

**Files:**
- `typeorm.config.ts` - update import

## File Structure After Implementation

```
src/database/
├── database.module.ts              # Updated with dataSourceFactory
├── database.module.test.ts         # Updated tests
├── database.config.ts              # NEW: Configuration factory
├── database.config.test.ts         # NEW: Config tests
├── typeorm-xray-logger.ts          # NEW: X-Ray observability
├── typeorm-xray-logger.test.ts     # NEW: Logger tests
├── rds-signer.ts                   # NEW: AWS RDS Signer utility
├── rds-signer.test.ts              # NEW: Signer tests
├── entities/
│   ├── index.ts                    # NEW: Entity exports
│   └── timestamped.entity.ts       # NEW: Abstract base entity
└── migrations/
    └── (empty, ready for first migration)
```

## Verification Checklist

- [x] `bun run build` passes (no TypeScript errors)
- [x] `bun run lint` passes (no ESLint errors)
- [x] `bun run test` passes (all tests green)
- [ ] `bun run start:local` starts successfully (skipped - AWS SSO credentials expired)
- [ ] Health check endpoint returns healthy database status (skipped - depends on server)
- [ ] `bun migration:generate --name=Test` works (skipped - requires database connection)

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typeorm-naming-strategies` | latest | SnakeNamingStrategy |
| `@aws-sdk/rds-signer` | latest (dev) | IAM authentication tokens |

## Notes

1. **No database schema changes** - This is configuration-only, no migrations needed
2. **Backward compatible** - Existing functionality preserved
3. **TDD approach** - Write tests before implementation per coding-philosophy skill
4. **Atomic commits** - One commit per task for clean history
