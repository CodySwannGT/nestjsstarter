# Task: Add confirmSignIn Method to LocalAuthService

**Type:** Task
**Parent:** None

## Description

Add the `confirmSignIn` method to `LocalAuthService`. This method validates OTP codes and returns authentication tokens on success. The magic OTP code `000000` always succeeds; any other code increments the attempt counter and fails.

## Acceptance Criteria

- [ ] `confirmSignIn` method added to `LocalAuthService`
- [ ] Method accepts `ConfirmSignInInput` and returns `Promise<ConfirmSignInResult>`
- [ ] OTP code `000000` returns success with mock tokens
- [ ] Any other OTP code returns error with attempts remaining
- [ ] Invalid session returns session error
- [ ] After 3 failed attempts, session is invalidated
- [ ] On success, session is deleted from storage
- [ ] User ID is deterministic based on identifier
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests cover all scenarios

## Relevant Research

From `brief.md`:
- Magic OTP: `000000`
- Max attempts: 3
- Generate deterministic user IDs from identifier

From reference implementation (`auth.service.ts`):
```typescript
const wasSuccessful = !result.ChallengeName;
const response: ConfirmSignInResult = {
  signInResult: wasSuccessful ? null : this.cognitoService.createSignInResult(...),
  authResult: !wasSuccessful ? null : this.cognitoService.createConfirmSignInResult(...),
  errorMessage: null,
};
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

Add to `src/auth/services/local-auth.service.ts`:

```typescript
import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { ConfirmSignInResult } from "../types/confirm-sign-in-result.type";
import {
  generateMockAccessToken,
  generateMockIdToken,
  generateMockRefreshToken,
  generateDeterministicUserId,
} from "../utils/mock-jwt.util";

const MAGIC_OTP = "000000";

/**
 * Confirms sign-in by validating OTP code
 * @param input - Confirmation input with OTP and session
 * @returns Confirmation result with tokens or error
 * @remarks Magic OTP "000000" always succeeds in local development
 */
async confirmSignIn(input: ConfirmSignInInput): Promise<ConfirmSignInResult> {
  const { otpCode, identifier, session } = input;

  const localSession = this.sessions.get(session);
  if (!localSession) {
    return {
      errorMessage: { message: "Invalid or expired session. Please sign in again." },
    };
  }

  if (localSession.identifier !== identifier) {
    return {
      errorMessage: { message: "Identifier does not match session." },
    };
  }

  // Check magic OTP
  if (otpCode === MAGIC_OTP) {
    // Success - generate tokens and clean up session
    this.sessions.delete(session);

    const userId = generateDeterministicUserId(identifier);
    const accessToken = generateMockAccessToken(userId);
    const idToken = generateMockIdToken(userId, {
      phone_number: identifier.includes("@") ? undefined : identifier,
      email: identifier.includes("@") ? identifier : undefined,
    });
    const refreshToken = generateMockRefreshToken(userId);

    return {
      authResult: {
        message: "Your identity has been verified",
        data: {
          accessToken,
          idToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: "Bearer",
        },
      },
    };
  }

  // Wrong OTP - increment attempts
  const newAttempts = localSession.attempts + 1;
  const attemptsLeft = MAX_ATTEMPTS - newAttempts;

  if (attemptsLeft <= 0) {
    // Max attempts reached - invalidate session
    this.sessions.delete(session);
    return {
      errorMessage: { message: "Maximum attempts exceeded. Please sign in again." },
    };
  }

  // Update session with new attempt count
  this.sessions.set(session, {
    ...localSession,
    attempts: newAttempts,
  });

  return {
    signInResult: {
      message: `Incorrect code. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
      data: {
        ChallengeName: "CUSTOM_CHALLENGE",
        Session: session,
        ChallengeParameters: {
          USERNAME: identifier,
          attempts: String(newAttempts),
          attemptsLeft: String(attemptsLeft),
          maxAttempts: String(MAX_ATTEMPTS),
        },
      },
    },
  };
}
```

## Testing Requirements

### Unit Tests

Add to test file `src/auth/services/local-auth.service.test.ts`:
- [ ] `describe('confirmSignIn')/it('should succeed with magic OTP 000000')`: Returns authResult
- [ ] `describe('confirmSignIn')/it('should return tokens on success')`: Verify token structure
- [ ] `describe('confirmSignIn')/it('should delete session on success')`: Session no longer exists
- [ ] `describe('confirmSignIn')/it('should fail with wrong OTP')`: Returns signInResult with attempts
- [ ] `describe('confirmSignIn')/it('should track attempt count')`: Attempts increment
- [ ] `describe('confirmSignIn')/it('should return error for invalid session')`: Returns errorMessage
- [ ] `describe('confirmSignIn')/it('should return error for mismatched identifier')`: Returns errorMessage
- [ ] `describe('confirmSignIn')/it('should invalidate session after 3 failed attempts')`: Returns max attempts error
- [ ] `describe('confirmSignIn')/it('should generate deterministic user ID')`: Same identifier = same userId

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `confirmSignIn` - @param, @returns, @remarks

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
2. Write tests for all confirmSignIn scenarios
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Add confirmSignIn method to LocalAuthService
2. Import required utilities and types
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
