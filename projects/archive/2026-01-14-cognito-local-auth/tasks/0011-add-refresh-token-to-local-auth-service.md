# Task: Add refreshToken Method to LocalAuthService

**Type:** Task
**Parent:** None

## Description

Add the `refreshToken` method to `LocalAuthService`. This method takes a refresh token and returns new mock access and ID tokens. In local development, this simply generates new tokens without validation.

## Acceptance Criteria

- [ ] `refreshToken` method added to `LocalAuthService`
- [ ] Method accepts `RefreshTokenInput` and returns `Promise<AuthenticationResultWithMessage>`
- [ ] Method decodes refresh token to extract user ID
- [ ] Generates new access token and ID token with fresh expiration
- [ ] Returns same refresh token (refresh tokens typically don't rotate)
- [ ] Returns error if refresh token is invalid or expired
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests cover success and error scenarios

## Relevant Research

From `brief.md`:
- `refreshToken(input)` - Returns new mock tokens

From reference implementation (`auth.service.ts`):
```typescript
async refreshToken(refreshTokenInput: RefreshTokenInput): Promise<AuthenticationResultWithMessage> {
  const response = await this.cognitoService.refreshToken(refreshTokenInput.refreshToken);
  return this.cognitoService.createConfirmSignInResult("Token refreshed", response);
}
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

Add to `src/auth/services/local-auth.service.ts`:

```typescript
import { RefreshTokenInput } from "../inputs/refresh-token.input";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { decodeMockToken, isTokenExpired } from "../utils/mock-jwt.util";

/**
 * Refreshes authentication tokens using a refresh token
 * @param input - Refresh token input
 * @returns New authentication tokens
 * @remarks In local development, validates token format and expiration only
 */
async refreshToken(input: RefreshTokenInput): Promise<AuthenticationResultWithMessage> {
  const { refreshToken } = input;

  // Decode and validate the refresh token
  const payload = decodeMockToken(refreshToken);
  if (!payload) {
    throw new Error("Invalid refresh token");
  }

  if (isTokenExpired(refreshToken)) {
    throw new Error("Refresh token has expired");
  }

  if (payload.token_use !== "refresh") {
    throw new Error("Invalid token type. Expected refresh token.");
  }

  // Extract user ID and generate new tokens
  const userId = payload["custom:realUserId"] as string;
  const newAccessToken = generateMockAccessToken(userId);
  const newIdToken = generateMockIdToken(userId);

  return {
    message: "Token refreshed",
    data: {
      accessToken: newAccessToken,
      idToken: newIdToken,
      refreshToken: refreshToken, // Return same refresh token
      expiresIn: 3600,
      tokenType: "Bearer",
    },
  };
}
```

## Testing Requirements

### Unit Tests

Add to test file `src/auth/services/local-auth.service.test.ts`:
- [ ] `describe('refreshToken')/it('should return new tokens for valid refresh token')`: Success case
- [ ] `describe('refreshToken')/it('should include new access token')`: Verify accessToken is different
- [ ] `describe('refreshToken')/it('should include new id token')`: Verify idToken is different
- [ ] `describe('refreshToken')/it('should return same refresh token')`: Verify refreshToken unchanged
- [ ] `describe('refreshToken')/it('should throw for invalid token')`: Error case
- [ ] `describe('refreshToken')/it('should throw for expired token')`: Error case
- [ ] `describe('refreshToken')/it('should throw for non-refresh token type')`: Wrong token_use

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `refreshToken` - @param, @returns, @remarks

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
2. Write tests for refreshToken success and error cases
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Add refreshToken method to LocalAuthService
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
