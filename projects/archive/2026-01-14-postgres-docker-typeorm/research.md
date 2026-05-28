---
date: 2026-01-14T12:00:00-05:00
status: complete
last_updated: 2026-01-14
---

# Research

## Summary

This research documents the existing codebase patterns and external resources relevant to implementing PostgreSQL Docker integration and TypeORM with NestJS. The ValkeyModule serves as the primary reference pattern for creating the DatabaseModule. The project targets AWS Aurora Serverless v2 for production with local PostgreSQL via Docker Compose for development.

## Detailed Findings

### ValkeyModule Reference Pattern

The ValkeyModule at `src/valkey/valkey.module.ts` serves as the canonical reference for implementing the DatabaseModule.

**Module Structure** (`valkey.module.ts:1-22`):
- Uses `@Global()` decorator to make the module available app-wide without explicit imports
- Simple module declaration with `providers` and `exports` arrays
- Exports the service for injection in other modules

```typescript
@Global()
@Module({
  providers: [ValkeyService],
  exports: [ValkeyService],
})
export class ValkeyModule {}
```

**Service Lifecycle Hooks** (`valkey.service.ts:44-85`):
- Implements `OnModuleInit` for connection initialization at startup
- Implements `OnModuleDestroy` for graceful disconnection on shutdown
- Uses NestJS Logger for connection status logging

**Configuration Pattern** (`valkey.service.ts:299-308`):
- Reads from environment variables with fallback defaults
- Configuration built in private method `getConfig()`
- Environment variables: `VALKEY_HOST`, `VALKEY_PORT`

**Interface Pattern** (`valkey.interface.ts:1-110`):
- Separate interface file for type definitions
- Constants for TTL values and key prefixes
- JSDoc documentation for all types and constants

### Docker Compose Infrastructure

Located at `docker-compose.yml`.

**Current Structure**:
- Single service: `valkey` using `valkey/valkey:8-alpine`
- Named network: `thumbwar-network` with bridge driver
- Named volume: `valkey_data` with local driver
- Health check using CLI command with interval, timeout, retries, start_period
- Restart policy: `unless-stopped`

**Pattern for PostgreSQL Service**:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: thumbwar-postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: thumbwar
      POSTGRES_PASSWORD: thumbwar_local
      POSTGRES_DB: thumbwar
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U thumbwar -d thumbwar']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - thumbwar-network
    restart: unless-stopped
```

### App Module Import Order

Located at `src/app.module.ts:26-53`.

**Current Import Order**:
1. `GraphQLModule.forRootAsync()` - with DataLoaderModule dependency
2. `DataLoaderModule`
3. `ValkeyModule`
4. `SubscriptionModule`
5. `HealthModule`
6. `HelloModule`

**DatabaseModule Placement**:
- Should be imported before feature modules that depend on database entities
- After ValkeyModule (both are infrastructure modules)
- Before any entity-dependent feature modules

### TypeScript Configuration

Located at `tsconfig.json`.

**Relevant Settings**:
- `emitDecoratorMetadata: true` - Required for NestJS decorators
- `experimentalDecorators: true` - Required for TypeORM decorators
- `module: "NodeNext"` - Modern module resolution
- `strict: true` - Strict type checking enabled
- Path alias: `@/*` maps to `./*`

### Serverless Configuration

Located at `serverless.yml`.

**Lambda Configuration**:
- Runtime: `nodejs22.x`
- Region: `us-east-1`
- Main handler timeout: 29 seconds
- Uses serverless-esbuild for bundling

**Aurora Integration Requirements** (for production):
- VPC configuration needed for Lambda to access Aurora
- Security group allowing port 5432
- Environment variables from SSM/Secrets Manager
- Consider RDS Proxy for connection pooling

### Health Check Implementation

Located at `src/health/`.

**Current Implementation** (`health.controller.ts:1-35`):
- Simple REST controller at `/health`
- Returns `{ status: "ok", timestamp: ISO string }`
- No database connectivity checks currently

**Extension Pattern for Database Health**:
- Option 1: Add TypeOrmHealthIndicator from @nestjs/terminus
- Option 2: Create custom health check that executes `SELECT 1`

## Code References

### Module Files
- `src/app.module.ts` - Root module with import order
- `src/valkey/valkey.module.ts` - Reference pattern for Global modules
- `src/data-loader/data-loader.module.ts` - Standard module pattern
- `src/health/health.module.ts` - Feature module pattern

### Service Files
- `src/valkey/valkey.service.ts` - Lifecycle hooks, configuration, client management
- `src/hello/hello.service.ts` - Basic injectable service pattern
- `src/data-loader/data-loader.service.ts` - Service with constructor injection

### Interface Files
- `src/valkey/valkey.interface.ts` - Interface and constant definitions
- `src/data-loader/data-loader.interface.ts` - Type definitions pattern

### Configuration Files
- `docker-compose.yml` - Docker infrastructure
- `serverless.yml` - Lambda configuration
- `tsconfig.json` - TypeScript settings
- `jest.config.ts` - Test configuration

## Architecture Documentation

### NestJS Module Patterns

**Global Module Pattern** (from ValkeyModule):
- Use `@Global()` decorator for infrastructure services needed app-wide
- Export services that other modules need to inject
- Handle connection lifecycle in service via `OnModuleInit`/`OnModuleDestroy`

**Standard Module Pattern** (from HelloModule, DataLoaderModule):
- Import dependencies from other modules
- Declare providers (services)
- Export services if other modules need them

### Environment Variable Pattern

Current environment variables for Valkey:
- `VALKEY_HOST` (default: `localhost`)
- `VALKEY_PORT` (default: `6379`)

Proposed for Database:
- `DATABASE_HOST` (default: `localhost`)
- `DATABASE_PORT` (default: `5432`)
- `DATABASE_USER` (default: `thumbwar`)
- `DATABASE_PASSWORD` (default: `thumbwar_local`)
- `DATABASE_NAME` (default: `thumbwar`)
- `DATABASE_SSL` (default: `false`, set `true` for production)

### Lambda Entry Point

Located at `src/main.ts`:
- Uses closure pattern for caching server instance (warm starts)
- Creates NestJS app with CORS configuration
- Uses `@vendia/serverless-express` for Lambda compatibility

## Testing Patterns

### Unit Test Patterns

**Location**: `src/**/*.test.ts` (co-located with source files)
**Framework**: Jest with ts-jest transform
**Configuration**: `jest.config.ts`

**Test Pattern** - Simple Service (from `hello.service.test.ts`):
```typescript
interface TestContext {
  service: HelloService;
}

describe("HelloService", () => {
  const ctx: TestContext = {} as TestContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloService],
    }).compile();
    ctx.service = module.get<HelloService>(HelloService);
  });

  describe("methodName", () => {
    it("should do expected behavior", () => {
      expect(ctx.service.methodName()).toBe(expected);
    });
  });
});
```

**Test Pattern** - Service with Mocked Dependencies (from `valkey.service.test.ts`):
```typescript
jest.mock("ioredis");

const createMockRedis = (): jest.Mocked<Redis> => {
  return { /* mock methods */ } as unknown as jest.Mocked<Redis>;
};

describe("ValkeyService", () => {
  beforeEach(async () => {
    ctx.mockRedis = createMockRedis();
    (Redis as unknown as jest.Mock).mockImplementation(() => ctx.mockRedis);
    // Create test module...
  });
});
```

**Example to follow**: `src/valkey/valkey.service.test.ts`
**Conventions**:
- Use TestContext interface for shared test state
- Create mock factories as functions
- Use `jest.mock()` at top level for external dependencies
- Clear mocks in `afterEach`

### Integration Test Patterns

**Location**: `src/**/*.integration.test.ts`
**Example**: `src/subscription/subscription.integration.test.ts`

**Conventions**:
- Check if external dependency (e.g., Valkey) is available before running tests
- Clean up test data before and after tests
- Use unique identifiers (e.g., `test-${Date.now()}`) for test data
- Import actual modules (not mocks) for integration testing
- Use `beforeAll`/`afterAll` for expensive setup/teardown

**Pattern for Database Integration Tests**:
```typescript
const isDatabaseAvailable = async (): Promise<boolean> => {
  // Check connection, return true/false
};

describe("Database Integration Tests", () => {
  beforeAll(async () => {
    isAvailable.value = await isDatabaseAvailable();
    if (!isAvailable.value) {
      console.warn("Skipping: Database not available. Run docker-compose up -d");
      return;
    }
    // Setup test module
  });

  afterAll(async () => {
    // Cleanup and close module
  });
});
```

### E2E Test Patterns

No e2e tests currently exist in the codebase. E2E tests would typically be placed in an `e2e/` directory.

## Documentation Patterns

### JSDoc Conventions

**File Header Pattern**:
```typescript
/**
 * @file filename.ts
 * @description Brief description of the file's purpose
 * @module module-name
 */
```

**Interface Documentation**:
```typescript
/**
 * Interface name
 * @description Detailed description of the interface purpose
 * @remarks Additional context about usage
 */
export interface InterfaceName {
  /** Property description */
  readonly propertyName: type;
}
```

**Service Documentation**:
```typescript
/**
 * Service name
 * @description What the service does
 * @remarks
 * - Bullet point about behavior
 * - Another behavior note
 */
@Injectable()
export class ServiceName { }
```

**Method Documentation**:
```typescript
/**
 * Brief description of what method does
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @remarks Additional context
 * @example
 * // Code example
 * service.method(arg);
 */
```

**Example**: `src/valkey/valkey.interface.ts:1-110`
**Required tags**: `@file`, `@description`, `@module` for files; `@param`, `@returns` for methods

### Database Comments (Backend Only)

No TypeORM entities currently exist. For new entities:
- Use JSDoc comments on entity classes
- Use `@Column({ comment: "description" })` for column comments
- Document relationships with `@remarks`

### GraphQL Descriptions (Backend Only)

**Pattern** (from `hello.resolver.ts`):
```typescript
@Query(() => String, { description: "Public health check" })
@Mutation(() => String, { description: "Requires authentication" })
```

**Conventions**:
- Include `description` in decorator options for public API documentation
- Document auth requirements in description
- Use JSDoc for method-level documentation

## External Resources

### TypeORM + NestJS Integration
- [NestJS Database Documentation](https://docs.nestjs.com/techniques/database)
- [TypeOrmModule DeepWiki](https://deepwiki.com/nestjs/typeorm/2.1-typeormmodule)
- [Configure TypeORM by Injecting NestJS Config](https://jaketrent.com/post/configure-typeorm-inject-nestjs-config/)

### TypeORM Migrations
- [TypeORM CLI Documentation](https://typeorm.io/docs/advanced-topics/using-cli/)
- [TypeORM Migration Commands](https://deepwiki.com/typeorm/typeorm/6.1-migration-commands)
- [NestJS with TypeORM CLI and Automatic Migrations](https://constantsolutions.dk/2024/08/05/nestjs-project-with-typeorm-cli-and-automatic-migrations/)

### Aurora Serverless v2 + Lambda
- [AWS Aurora RDS Proxy Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.html)
- [Using AWS Lambda with Amazon RDS](https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html)
- [Aurora PostgreSQL Connection Pooling Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.BestPractices.connection_pooling.html)

### Health Checks
- [NestJS Terminus GitHub](https://github.com/nestjs/terminus)
- [TypeOrmHealthIndicator Source](https://github.com/nestjs/terminus/blob/master/lib/health-indicator/database/typeorm.health.ts)
- [Health checks with Terminus](https://sevic.dev/notes/healthcheck-terminus-nestjs/)

## Open Questions

<!--
Structure each question with context and impact.
The Answer field must be filled by a human before planning can proceed.
-->

### Q1: RDS Proxy for Production
**Question**: Should RDS Proxy be used for production Lambda-to-Aurora connections?
**Context**: The brief mentions considering RDS Proxy for connection pooling. Aurora Serverless v2 supports RDS Proxy. Web research indicates Lambda should create connections at init time, not per-invocation.
**Impact**: Affects serverless.yml VPC configuration, connection string format, and IAM authentication setup.
**Answer**: Yes. Use RDS Proxy for production Lambda-to-Aurora connections.

### Q2: Health Check Approach
**Question**: Should the project use @nestjs/terminus for health checks or extend the existing custom implementation?
**Context**: The current health check is a simple controller returning status and timestamp. @nestjs/terminus provides TypeOrmHealthIndicator out of the box. Adding terminus would be a new dependency.
**Impact**: Affects health module implementation, dependency choices, and response format.
**Answer**: Use @nestjs/terminus. Always prefer existing solutions over custom implementations.

### Q3: Entity Registration Strategy
**Question**: Should entities use `autoLoadEntities: true` or explicit registration in the DatabaseModule?
**Context**: TypeORM supports both approaches. `autoLoadEntities` is simpler but less explicit. Explicit registration provides better control but requires updating the module for each new entity.
**Impact**: Affects DatabaseModule configuration and onboarding pattern for new entities.
**Answer**: Use `autoLoadEntities: true` for simpler entity registration.

### Q4: Migration Script Runtime
**Question**: Should migration scripts use `ts-node` or `tsx` for TypeScript execution?
**Context**: The brief suggests `typeorm-ts-node-commonjs` but web research indicates `tsx` provides better path alias support and simpler configuration. The project uses bun as package manager.
**Impact**: Affects package.json migration scripts and potentially devDependencies.
**Answer**: Use ts-node. tsx is for React and should not be used in this project.
