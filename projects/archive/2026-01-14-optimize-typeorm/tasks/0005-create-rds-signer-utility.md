# Task: Create RDS Signer Utility

**Type:** Task
**Parent:** None

## Description

Create a utility module for generating AWS RDS IAM authentication tokens. This enables passwordless database authentication in production environments using AWS IAM instead of storing database passwords in environment variables.

## Acceptance Criteria

- [ ] `src/database/rds-signer.ts` exists
- [ ] Exports `generateRdsAuthToken(hostname, port, username)` function
- [ ] Uses `@aws-sdk/rds-signer` package
- [ ] Returns temporary auth token (15 min validity per AWS spec)
- [ ] Has comprehensive test coverage
- [ ] File has JSDoc preamble
- [ ] Function has proper error handling

## Relevant Research

From brief.md Task 3.2:

Create utility for production IAM authentication:
- `generateRdsAuthToken(hostname, port, username)` function
- Uses `@aws-sdk/rds-signer`
- Returns temporary auth token (15 min validity)

From research.md "Configuration Factory Pattern":
- Production uses replication with RDS Signer
- `createProductionConfig()` will use this utility

AWS RDS Signer usage pattern:
```typescript
import { Signer } from "@aws-sdk/rds-signer";

const signer = new Signer({
  hostname: "your-rds-endpoint.region.rds.amazonaws.com",
  port: 5432,
  username: "db_user",
});

const token = await signer.getAuthToken();
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD approach)
- `/typeorm-patterns` - RDS Signer integration pattern
- `/nestjs-rules` - NestJS patterns

## Implementation Details

**Files to create:**
- `src/database/rds-signer.ts`
- `src/database/rds-signer.test.ts`

**Function signature:**
```typescript
export async function generateRdsAuthToken(
  hostname: string,
  port: number,
  username: string
): Promise<string>
```

**Implementation requirements:**
1. Import `Signer` from `@aws-sdk/rds-signer`
2. Create Signer instance with provided parameters
3. Call `getAuthToken()` and return result
4. Handle potential errors gracefully

**Error handling:**
- Wrap in try/catch
- Log errors but propagate them (caller needs to handle auth failures)
- Include hostname in error messages for debugging

## Testing Requirements

### Unit Tests
Test file: `src/database/rds-signer.test.ts`

- [ ] `describe('generateRdsAuthToken')/it('should create Signer with correct parameters')`: Verifies Signer instantiation
- [ ] `describe('generateRdsAuthToken')/it('should return auth token from signer')`: Returns token successfully
- [ ] `describe('generateRdsAuthToken')/it('should pass hostname to Signer')`: Hostname passed correctly
- [ ] `describe('generateRdsAuthToken')/it('should pass port to Signer')`: Port passed correctly
- [ ] `describe('generateRdsAuthToken')/it('should pass username to Signer')`: Username passed correctly
- [ ] `describe('generateRdsAuthToken')/it('should propagate Signer errors')`: Error handling works

### Integration Tests
N/A - AWS integration tested in production environment

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file`, `@description`, `@module` tags
- [ ] `generateRdsAuthToken` function with `@param`, `@returns`, `@throws`, `@description`
- [ ] `@remarks` explaining 15-minute token validity

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && bun run test -- --testPathPattern="rds-signer" --coverage --collectCoverageFrom='src/database/rds-signer.ts'
```

### Expected Output
- All tests pass
- Coverage report shows high coverage for rds-signer.ts

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

1. Create `src/database/rds-signer.test.ts`
2. Mock `@aws-sdk/rds-signer` module
3. Write tests for all acceptance criteria
4. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/database/rds-signer.ts`
2. Implement `generateRdsAuthToken` function
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
