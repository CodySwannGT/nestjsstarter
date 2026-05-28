# Findings

This document captures discoveries, learnings, and notes made during project implementation.

## Task 4: DatabaseModule Testing Approach

When testing NestJS modules that use TypeORM, mocking `TypeOrmModule.forRootAsync` directly is problematic because the decorator runs at import time before tests execute. The solution is to:

1. Extract the configuration factory function as an exported function (`createTypeOrmConfig`)
2. Test the factory function directly for configuration verification
3. Mock TypeOrmModule only for basic module definition tests

This approach provides better testability and follows the pattern of making code testable by extracting pure functions from decorator-based configurations.

## Task 5: Mocking Global Database Modules in AppModule Tests

When testing AppModule that imports a global DatabaseModule, the `overrideModule` approach does not work because TypeORM initializes before overrides take effect. The solution is to use `jest.mock` to replace the entire DatabaseModule with a mock class:

```typescript
jest.mock("./database/database.module", () => ({
  DatabaseModule: class MockDatabaseModule {},
}));
```

Then use dynamic imports (`await import("./app.module")`) in each test to ensure the mock is applied before module resolution. This prevents database connection attempts during unit tests.

## Task 6: Environment Variable Patterns for Database Configuration

When adding database environment variables:

1. Use `.env.example` as documentation - it should be committed and contain example values with comments explaining production configurations
2. Use `.env.development` for actual local development values - it should be gitignored to protect credentials
3. If `.env.development` was previously tracked with empty contents, use `git rm --cached .env.development` to remove it from tracking before adding credentials
4. The naming convention follows the existing pattern (`VALKEY_HOST`, `VALKEY_PORT`) so use `DATABASE_HOST`, `DATABASE_PORT`, etc.
