# Task: Create GraphQL operation logging plugin

**Type:** Task
**Parent:** None

## Description

Create an Apollo Server plugin `OperationLoggingPlugin` at `src/graphql/operation-logging.plugin.ts` that traces GraphQL operations with X-Ray subsegments. This captures operation name, type (query/mutation), duration, and errors for every GraphQL request.

## Acceptance Criteria

- [ ] `src/graphql/operation-logging.plugin.ts` file exists
- [ ] Uses `@Plugin()` decorator from `@nestjs/apollo`
- [ ] Implements `ApolloServerPlugin` interface
- [ ] Creates subsegment named "GraphQL:{operationName}"
- [ ] Records operation type, duration, and error status as annotations
- [ ] Records full details as metadata
- [ ] Logs to CloudWatch via NestJS Logger
- [ ] Gracefully handles missing X-Ray context
- [ ] Unit tests pass with 100% coverage

## Relevant Research

From brief.md (lines 408-571):
- Plugin uses `@Plugin()` decorator
- Implements `requestDidStart()` returning `GraphQLRequestListener`
- Uses `willSendResponse` hook for timing and tracing
- Extracts operation name from request or document
- Extracts operation type from document
- Creates X-Ray subsegment with annotations

From research.md:
- Existing plugin pattern at `src/graphql/complexity.plugin.ts` (line 92-97)
- Uses `GraphQLSchemaHost` and `ConfigService` injection
- Registered in `AppModule.providers` array (line 102)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/jsdoc-best-practices` - For file preamble and function documentation
- `/nestjs-graphql` - For Apollo plugin patterns

## Implementation Details

Create `src/graphql/operation-logging.plugin.ts` with:

1. File preamble with @file, @description, @module, @remarks
2. `RequestContext` interface for type safety
3. `OperationLoggingPlugin` class:
   - `@Plugin()` decorator
   - Private `logger` instance
   - `requestDidStart()` method returning listener
   - `willSendResponse` callback for timing/tracing
   - `extractOperationName()` helper
   - `extractOperationType()` helper
   - `addXRayAnnotations()` helper with error handling

Files to create:
- `src/graphql/operation-logging.plugin.ts`

## Testing Requirements

### Unit Tests
Reference: `src/database/typeorm-xray-logger.test.ts` for testing patterns

- [ ] `describe('OperationLoggingPlugin')/it('should extract operation name from request')`: Test named operation
- [ ] `describe('OperationLoggingPlugin')/it('should use "anonymous" when operation has no name')`: Test anonymous fallback
- [ ] `describe('OperationLoggingPlugin')/it('should extract operation type from document')`: Test query/mutation detection
- [ ] `describe('OperationLoggingPlugin')/it('should log operation completion to CloudWatch')`: Verify logger calls
- [ ] `describe('OperationLoggingPlugin')/it('should handle missing X-Ray context gracefully')`: Test degradation

### Integration Tests
N/A - requires GraphQL server context

### E2E Tests
N/A - infrastructure change

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with @file, @description, @module, @remarks
- [ ] `RequestContext` interface - @description
- [ ] `OperationLoggingPlugin` class - @description
- [ ] `requestDidStart` - @description of lifecycle hook
- [ ] `extractOperationName` - @param, @returns
- [ ] `extractOperationType` - @param, @returns
- [ ] `addXRayAnnotations` - @param descriptions

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - plugin doesn't add GraphQL types

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="operation-logging.plugin.test.ts" --coverage --collectCoverageFrom='src/graphql/operation-logging.plugin.ts'
```

### Expected Output
```
All tests passing with coverage for operation-logging.plugin.ts
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read existing plugin
- Write failing tests
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/jsdoc-best-practices`
4. Invoke `/nestjs-graphql`

Mark "Invoke skills" as completed.

### Step 2: Read Existing Plugin
Mark "Read existing plugin" as in_progress.

Read `src/graphql/complexity.plugin.ts` to understand pattern.

Mark "Read existing plugin" as completed.

### Step 3: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create `src/graphql/operation-logging.plugin.test.ts`
2. Write tests for operation extraction and logging
3. Run tests to confirm they fail (file doesn't exist yet)

Mark "Write failing tests" as completed.

### Step 4: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/graphql/operation-logging.plugin.ts`
2. Implement all methods
3. Run tests to confirm they pass

Mark "Write implementation" as completed.

### Step 5: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 6: Update Documentation
Mark "Update documentation" as in_progress.

Complete all items in Documentation Requirements section.

Mark "Update documentation" as completed.

### Step 7: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
