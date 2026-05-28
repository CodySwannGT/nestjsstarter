---
date: 2026-01-14T12:00:00-05:00
status: complete
last_updated: 2026-01-14
---

# Research

## Summary

This research documents the current TypeORM implementation in the thumbwar backend and identifies patterns needed to align with the `.claude/skills/typeorm-patterns/SKILL.md` specification. The project involves refactoring database configuration, adding observability, and creating entity infrastructure without changing database schema.

**Current State**: The project has a functional but minimal TypeORM setup using `TypeOrmModule.forRootAsync()` with `autoLoadEntities: true`. It lacks the target patterns for naming strategy, explicit entity exports, X-Ray logging, RDS Signer integration, and abstract base entity.

**Target State**: Align with skill patterns including `dataSourceFactory`, `SnakeNamingStrategy`, explicit entity exports via `index.ts`, `TimestampedEntity` abstract class, `TypeOrmXRayLogger` with graceful degradation, and production replication with AWS RDS Signer.

## Detailed Findings

### Current Database Implementation

The database infrastructure consists of four files with interconnected dependencies:

#### database.module.ts (`src/database/database.module.ts:1-38`)

- Uses `@Global()` decorator (skill recommends removing)
- Uses `TypeOrmModule.forRootAsync()` with `useFactory` only
- Missing `dataSourceFactory` for full DataSource control
- Imports configuration from `database.interface.ts`
- Sets `autoLoadEntities: true` (skill requires explicit entity exports)

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

#### database.interface.ts (`src/database/database.interface.ts:1-111`)

- Defines `DatabaseConfig` interface and constants
- Contains `createBaseTypeOrmConfig()` factory function
- Contains `parseSslConfig()` for SSL configuration
- Uses default values for local development
- Missing `SnakeNamingStrategy`
- Missing custom logger
- No replication support

#### typeorm.config.ts (`typeorm.config.ts:1-23`)

- CLI DataSource for migration operations
- Imports `createBaseTypeOrmConfig()` from database.interface
- Uses glob patterns for entities: `src/**/*.entity.ts`
- Uses glob patterns for migrations: `src/database/migrations/*.ts`
- Missing `SnakeNamingStrategy`

#### entities directory (`src/database/entities/`)

- Currently contains only `.keep` placeholder file
- No `TimestampedEntity` abstract base class
- No `index.ts` for explicit exports

### Package Dependencies

From `package.json`, current TypeORM-related dependencies:

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/typeorm` | `^11.0.0` | NestJS TypeORM integration |
| `typeorm` | `^0.3.28` | TypeORM core |
| `pg` | `^8.16.3` | PostgreSQL driver |

**Missing Dependencies** (per brief):
- `typeorm-naming-strategies` - For `SnakeNamingStrategy`
- `@aws-sdk/rds-signer` - For IAM authentication (runtime dependency for production)

### Health Check Integration

The health check system (`src/health/health.controller.ts:1-41`) uses `@nestjs/terminus` with `TypeOrmHealthIndicator`:

```typescript
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck("database")]);
  }
}
```

This pattern works automatically with `TypeOrmModule.forRootAsync()` and will continue to work after refactoring.

### Environment Variables Used

From `database.interface.ts`, the following environment variables are read:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_HOST` | `localhost` | Database host |
| `DATABASE_PORT` | `5432` | Database port |
| `DATABASE_USER` | `thumbwar` | Database username |
| `DATABASE_PASSWORD` | `thumbwar_local` | Database password |
| `DATABASE_NAME` | `thumbwar` | Database name |
| `DATABASE_SSL` | `false` | Enable SSL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | SSL certificate verification |

**Additional variables needed** for production (per skill patterns):
- `IS_OFFLINE` - Local development flag
- `DATABASE_PROXY_HOST` - RDS Proxy endpoint
- `DATABASE_PROXY_HOST_READ_1` - Read replica endpoint

### Module Structure Patterns

The codebase follows consistent NestJS module patterns:

#### Global Modules

`ValkeyModule` (`src/valkey/valkey.module.ts:1-22`) uses `@Global()`:

```typescript
@Global()
@Module({
  providers: [ValkeyService],
  exports: [ValkeyService],
})
export class ValkeyModule {}
```

**Note**: The skill recommends removing `@Global()` from `DatabaseModule` since `TypeOrmModule` handles injection automatically.

#### Standard Modules

`HealthModule` (`src/health/health.module.ts:1-20`) follows standard pattern:

```typescript
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

### Service Implementation Patterns

`ValkeyService` (`src/valkey/valkey.service.ts:1-309`) demonstrates patterns relevant to the X-Ray logger:

1. **Private logger instance**: `private readonly logger = new Logger(ValkeyService.name);`
2. **Environment-based configuration**: `getConfig()` method reads env vars with defaults
3. **Lifecycle hooks**: `OnModuleInit`, `OnModuleDestroy`
4. **Error handling**: Never throws from internal operations, logs errors

## Code References

### Files to Update

- `src/database/database.module.ts:1-38` - Add `dataSourceFactory`, remove `@Global()`
- `src/database/database.interface.ts:1-111` - Will be replaced by `database.config.ts`
- `typeorm.config.ts:1-23` - Add `SnakeNamingStrategy`

### Files to Create

- `src/database/database.config.ts` - New configuration factory
- `src/database/typeorm-xray-logger.ts` - Custom X-Ray logger
- `src/database/rds-signer.ts` - AWS RDS Signer utility
- `src/database/entities/timestamped.entity.ts` - Abstract base entity
- `src/database/entities/index.ts` - Entity exports

### Files to Delete

- `src/database/database.interface.ts` - Replaced by database.config.ts
- `src/database/database.interface.test.ts` - Tests will be migrated
- `src/database/entities/.keep` - Replaced by actual files

### Test Files

- `src/database/database.module.test.ts:1-92` - Update for new module structure
- Create: `src/database/database.config.test.ts`
- Create: `src/database/typeorm-xray-logger.test.ts`
- Create: `src/database/rds-signer.test.ts`

## Architecture Documentation

### NestJS Module Registration

`AppModule` (`src/app.module.ts:1-58`) imports `DatabaseModule`:

```typescript
@Module({
  imports: [
    // ... GraphQLModule config
    DatabaseModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### TypeORM Integration Pattern

Per skill and NestJS documentation, the target pattern uses `dataSourceFactory`:

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

### Configuration Factory Pattern

Per skill patterns in `references/configuration-patterns.md`:

- `isLocalEnvironment()` - Checks `IS_OFFLINE` or `NODE_ENV === "test"`
- `createBaseConfig()` - Shared config with `SnakeNamingStrategy` and logger
- `createLocalConfig()` - Direct connection for development
- `createProductionConfig()` - Replication with RDS Signer

### X-Ray Logger Pattern

From `references/observability-patterns.md`, the logger:

- Implements TypeORM's `Logger` interface
- Creates X-Ray subsegments per query
- Extracts query type (SELECT/INSERT/UPDATE/DELETE)
- Extracts table name for metrics
- Sanitizes parameters (never logs sensitive data)
- Never throws (defensive programming)
- Falls back gracefully when X-Ray SDK unavailable

## Testing Patterns

### Unit Test Patterns

- **Location**: `src/**/*.test.ts`
- **Framework**: Jest 30.x with `@nestjs/testing`
- **Example to follow**: `src/database/database.module.test.ts:1-92`
- **Conventions**:
  - Use `Test.createTestingModule()` from `@nestjs/testing`
  - Mock external modules to avoid connections
  - Use `TestContext` interface pattern for shared state
  - Clean up mocks with `jest.clearAllMocks()` in `afterEach`

```typescript
// Test context pattern from valkey.service.test.ts
interface TestContext {
  service: ValkeyService;
  mockRedis: jest.Mocked<Redis>;
}

describe("ValkeyService", () => {
  const ctx: TestContext = {} as TestContext;
  // ...
});
```

### Integration Test Patterns

- **Location**: `src/**/*.integration.test.ts`
- **Example**: `src/subscription/subscription.integration.test.ts`
- **Run command**: `bun run test:integration`

### Mock Patterns

Database module mocking from `database.module.test.ts`:

```typescript
jest.mock("@nestjs/typeorm", () => ({
  TypeOrmModule: {
    forRootAsync: jest.fn().mockReturnValue({
      module: class MockTypeOrmModule {},
      providers: [{ provide: "DATA_SOURCE", useValue: {} }],
      exports: ["DATA_SOURCE"],
    }),
  },
  getDataSourceToken: jest.fn().mockReturnValue("DATA_SOURCE"),
}));
```

### Environment Variable Testing

From `database.interface.test.ts`:

```typescript
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.DATABASE_HOST;
  // ... delete other vars
});

afterEach(() => {
  process.env = originalEnv;
});
```

## Documentation Patterns

### JSDoc Conventions

- **Style**: Full JSDoc with `@file`, `@description`, `@module` preambles
- **Example**: `src/database/database.module.ts:1-8`
- **Required tags**: `@param`, `@returns`, `@description`, `@remarks`

```typescript
/**
 * @file database.module.ts
 * @description Global database module for PostgreSQL/TypeORM configuration
 * @module database
 */
```

### Function Documentation

```typescript
/**
 * Creates TypeORM configuration from environment variables
 * @description Factory function for TypeORM module configuration
 * @returns TypeORM configuration object for PostgreSQL
 */
export function createTypeOrmConfig(): TypeOrmModuleOptions {
```

### Database Comments (Backend Only)

- **Convention**: All columns and entities require `comment` property
- **Example from skill**: `@Column({ comment: "User email address for authentication" })`
- **Required for**: All columns, all entities

### GraphQL Descriptions (Backend Only)

- **Convention**: Use `@Field(() => Type, { description: "..." })` pattern
- **Required for**: All public API fields

## Skill Dependencies

This project should leverage multiple skills:

| Skill | Purpose |
|-------|---------|
| `coding-philosophy` | TDD, immutability, function ordering |
| `nestjs-rules` | Component generation, module structure |
| `typeorm-patterns` | Target patterns being implemented |

### TDD Requirements

Per `coding-philosophy` skill:
1. **RED**: Write failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Component Generation

Per `nestjs-rules` skill, use NestJS CLI:
```bash
bunx nest g service <name> --no-spec
bunx nest g module <name> --no-spec
```

However, for this project, most changes are to existing files rather than new components.

## Open Questions

<!--
Structure each question with context and impact.
The Answer field must be filled by a human before planning can proceed.
-->

[None identified]

The brief is comprehensive and provides detailed implementation tasks with clear acceptance criteria. All patterns are documented in the typeorm-patterns skill references.
