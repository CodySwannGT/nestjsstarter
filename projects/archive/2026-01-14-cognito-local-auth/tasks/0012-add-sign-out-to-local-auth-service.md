# Task: Add signOut Method to LocalAuthService

**Type:** Task
**Parent:** None

## Description

Add the `signOut` method to `LocalAuthService`. In local development, this is essentially a no-op since sessions are ephemeral and tokens aren't tracked after generation. The method returns a success message.

## Acceptance Criteria

- [ ] `signOut` method added to `LocalAuthService`
- [ ] Method accepts `accessToken: string` and optional `request: Request`
- [ ] Returns `Promise<Message>` with success message
- [ ] Method is essentially a no-op (local tokens don't need invalidation)
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify return structure

## Relevant Research

From `brief.md`:
- `signOut(accessToken)` - Clears session (no-op for local)

From reference implementation (`auth.service.ts`):
```typescript
async signOut(accessToken: string, request?: RequestWithUser): Promise<Message> {
  await this.cognitoService.globalSignOut(accessToken);
  return {
    message: "Sign out successful.",
  };
}
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

Add to `src/auth/services/local-auth.service.ts`:

```typescript
import { Request } from "express";
import { Message } from "../types/message.type";

/**
 * Signs out user from current session
 * @param _accessToken - JWT access token (unused in local mode)
 * @param _request - Express request object (unused in local mode)
 * @returns Success message
 * @remarks In local development, this is a no-op as tokens are not tracked
 */
async signOut(_accessToken: string, _request?: Request): Promise<Message> {
  // Local development doesn't track issued tokens
  // Simply return success message
  return {
    message: "Sign out successful.",
  };
}
```

## Testing Requirements

### Unit Tests

Add to test file `src/auth/services/local-auth.service.test.ts`:
- [ ] `describe('signOut')/it('should return success message')`: Verify message structure
- [ ] `describe('signOut')/it('should return "Sign out successful." message')`: Verify exact message

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `signOut` - @param, @returns, @remarks

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no direct GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/services/local-auth.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/services/local-auth.service.ts' --coverageThreshold='{"global":{"lines":80}}'
```

### Expected Output
All tests pass. Coverage meets 80% threshold.

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write failing tests
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

**CRITICAL**: DO NOT STOP until all todos are marked completed.

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke each skill listed in "Applicable Skills" using the Skill tool

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Add tests to existing test file
2. Write tests for signOut method
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Add signOut method to LocalAuthService
2. Import Request type from express
3. Run tests until they pass

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Complete all items in Documentation Requirements section.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
