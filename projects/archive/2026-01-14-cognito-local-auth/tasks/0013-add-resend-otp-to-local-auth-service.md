# Task: Add resendOTP Method to LocalAuthService

**Type:** Task
**Parent:** None

## Description

Add the `resendOTP` method to `LocalAuthService`. This method allows users to request a new OTP code. In the local implementation, it simply calls `signIn` to create a new session.

## Acceptance Criteria

- [ ] `resendOTP` method added to `LocalAuthService`
- [ ] Method accepts `ResendOtpInput` and returns `Promise<SignInResult>`
- [ ] Method delegates to `signIn` method (same behavior)
- [ ] Full `IAuthService` interface is now implemented
- [ ] Update class declaration to implement full `IAuthService`
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify return structure

## Relevant Research

From reference implementation (`auth.service.ts`):
```typescript
async resendOTP(resendOtpInput: ResendOtpInput): Promise<SignInResult> {
  return await this.signIn(resendOtpInput);
}
```

The resendOTP method is functionally identical to signIn - it creates a new session and returns challenge data.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

Add to `src/auth/services/local-auth.service.ts`:

```typescript
import { ResendOtpInput } from "../inputs/resend-otp.input";

// Update class declaration:
export class LocalAuthService implements IAuthService {

/**
 * Resends OTP code by creating a new session
 * @param input - Resend OTP input with identifier
 * @returns Sign-in result with new challenge data
 * @remarks This delegates to signIn as the behavior is identical
 */
async resendOTP(input: ResendOtpInput): Promise<SignInResult> {
  return this.signIn(input);
}
```

After this task, the `LocalAuthService` class should:
1. Import all input types
2. Implement full `IAuthService` interface
3. Have all 5 methods: `signIn`, `confirmSignIn`, `refreshToken`, `signOut`, `resendOTP`

## Testing Requirements

### Unit Tests

Add to test file `src/auth/services/local-auth.service.test.ts`:
- [ ] `describe('resendOTP')/it('should return SignInResult with new session')`: Verify structure
- [ ] `describe('resendOTP')/it('should create new session ID different from previous')`: Different session
- [ ] `describe('LocalAuthService')/it('should implement IAuthService interface')`: Type check

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `resendOTP` - @param, @returns, @remarks

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
2. Write tests for resendOTP method
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Add resendOTP method to LocalAuthService
2. Update class to implement full IAuthService interface
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
