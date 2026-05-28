# Task: Create TypeOrmXRayLogger

**Type:** Task
**Parent:** None

## Description

Create a custom TypeORM logger that integrates with AWS X-Ray for observability. The logger creates X-Ray subsegments for each database query, enabling distributed tracing in production while gracefully degrading in local development when the X-Ray SDK is unavailable.

## Acceptance Criteria

- [ ] `src/database/typeorm-xray-logger.ts` exists
- [ ] Implements TypeORM `Logger` interface
- [ ] Creates X-Ray subsegments per query with query metadata
- [ ] Extracts query type (SELECT/INSERT/UPDATE/DELETE)
- [ ] Extracts table name from queries
- [ ] Sanitizes parameters (never logs sensitive data)
- [ ] Never throws exceptions (defensive programming)
- [ ] Falls back gracefully when X-Ray SDK unavailable (local dev)
- [ ] Has comprehensive test coverage
- [ ] File has JSDoc preamble

## Relevant Research

From brief.md Task 3.1:

Create custom logger with:
- AWS X-Ray subsegment creation per query
- Graceful degradation when X-Ray SDK unavailable (local dev)
- Query type extraction (SELECT/INSERT/UPDATE/DELETE)
- Table name extraction
- Parameter sanitization (no sensitive data logged)
- Defensive programming (never throws)

From research.md "X-Ray Logger Pattern":
- Implements TypeORM's `Logger` interface
- Creates X-Ray subsegments per query
- Extracts query type (SELECT/INSERT/UPDATE/DELETE)
- Extracts table name for metrics
- Sanitizes parameters (never logs sensitive data)
- Never throws (defensive programming)
- Falls back gracefully when X-Ray SDK unavailable

From research.md "Service Implementation Patterns" (ValkeyService):
- Private logger instance pattern: `private readonly logger = new Logger(ClassName.name);`
- Error handling: Never throws from internal operations, logs errors

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD approach)
- `/typeorm-patterns` - Observability patterns, X-Ray logger reference
- `/nestjs-rules` - NestJS patterns

## Implementation Details

**Files to create:**
- `src/database/typeorm-xray-logger.ts`
- `src/database/typeorm-xray-logger.test.ts`

**TypeORM Logger interface methods to implement:**
- `logQuery(query, parameters, queryRunner)` - Log query execution
- `logQueryError(error, query, parameters, queryRunner)` - Log query errors
- `logQuerySlow(time, query, parameters, queryRunner)` - Log slow queries
- `logSchemaBuild(message, queryRunner)` - Log schema build messages
- `logMigration(message, queryRunner)` - Log migration messages
- `log(level, message, queryRunner)` - General logging

**X-Ray integration approach:**
1. Try to import `aws-xray-sdk-core` dynamically
2. If available, create subsegment for each query
3. If unavailable (local dev), fall back to console logging
4. Never let X-Ray errors affect database operations

**Query metadata extraction:**
- Query type: Extract first word (SELECT, INSERT, UPDATE, DELETE)
- Table name: Parse from query string using regex

**Parameter sanitization:**
- Replace actual values with placeholders or type indicators
- Never log passwords, tokens, or PII

## Testing Requirements

### Unit Tests
Test file: `src/database/typeorm-xray-logger.test.ts`

- [ ] `describe('TypeOrmXRayLogger')/it('should create logger instance')`: Logger instantiates correctly
- [ ] `describe('TypeOrmXRayLogger')/it('should extract query type from SELECT query')`: Returns "SELECT"
- [ ] `describe('TypeOrmXRayLogger')/it('should extract query type from INSERT query')`: Returns "INSERT"
- [ ] `describe('TypeOrmXRayLogger')/it('should extract query type from UPDATE query')`: Returns "UPDATE"
- [ ] `describe('TypeOrmXRayLogger')/it('should extract query type from DELETE query')`: Returns "DELETE"
- [ ] `describe('TypeOrmXRayLogger')/it('should extract table name from query')`: Parses table correctly
- [ ] `describe('TypeOrmXRayLogger')/it('should sanitize parameters')`: Replaces sensitive values
- [ ] `describe('TypeOrmXRayLogger')/it('should not throw when X-Ray unavailable')`: Graceful degradation
- [ ] `describe('TypeOrmXRayLogger')/it('should log query without error')`: logQuery works
- [ ] `describe('TypeOrmXRayLogger')/it('should log query error without throwing')`: logQueryError works
- [ ] `describe('TypeOrmXRayLogger')/it('should log slow query without error')`: logQuerySlow works

### Integration Tests
N/A - X-Ray integration tested in production environment

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file`, `@description`, `@module` tags
- [ ] `TypeOrmXRayLogger` class with `@description`, `@implements`
- [ ] Each public method with `@param`, `@returns`, `@description`
- [ ] Helper functions with `@param`, `@returns`

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && bun run test -- --testPathPattern="typeorm-xray-logger" --coverage --collectCoverageFrom='src/database/typeorm-xray-logger.ts'
```

### Expected Output
- All tests pass
- Coverage report shows high coverage for typeorm-xray-logger.ts

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

1. Create `src/database/typeorm-xray-logger.test.ts`
2. Write tests for all acceptance criteria
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/database/typeorm-xray-logger.ts`
2. Implement TypeORM Logger interface
3. Add X-Ray integration with graceful fallback
4. Add query metadata extraction
5. Add parameter sanitization
6. Run tests until all pass

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
