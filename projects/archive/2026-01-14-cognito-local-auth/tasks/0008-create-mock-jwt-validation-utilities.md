# Task: Create Mock JWT Validation Utilities

**Type:** Task
**Parent:** None

## Description

Create utility functions for decoding and validating mock JWT tokens. These functions allow the JWT guard to validate tokens in local development mode without cryptographic verification.

## Acceptance Criteria

- [ ] `decodeMockToken(token: string)` function added to `src/auth/utils/mock-jwt.util.ts`
- [ ] `isTokenExpired(token: string)` function added to `src/auth/utils/mock-jwt.util.ts`
- [ ] `decodeMockToken` returns payload object or null for invalid tokens
- [ ] `isTokenExpired` returns boolean based on `exp` claim
- [ ] Functions handle malformed tokens gracefully (return null/true)
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify decoding and expiration logic

## Relevant Research

From `brief.md`:
- `decodeMockToken(token: string): TokenPayload | null`
- `isTokenExpired(token: string): boolean`

From `research.md` - websocket authorizer pattern (`src/websocket/authorizer/ws-authorizer.handler.ts:62-74`):
```typescript
const decodeJwtUnsafe = (token: string): JwtPayload => {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded);
};
```

The local auth should follow a similar pattern but with null-safety.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

Add to `src/auth/utils/mock-jwt.util.ts`:

```typescript
/**
 * Decodes a mock JWT token without cryptographic verification
 * @param token - The JWT token string to decode
 * @returns The decoded payload or null if token is invalid
 * @remarks Only use this for local development tokens
 */
export function decodeMockToken(token: string): MockTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1];
    // Handle base64url encoding
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(json) as MockTokenPayload;

    // Validate required fields
    if (!payload.sub || !payload.exp || !payload.iat) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks if a mock JWT token has expired
 * @param token - The JWT token string to check
 * @returns true if token is expired or invalid, false if valid and not expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeMockToken(token);
  if (!payload) {
    return true; // Invalid tokens are considered expired
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
```

## Testing Requirements

### Unit Tests

Add to test file `src/auth/utils/mock-jwt.util.test.ts`:
- [ ] `describe('decodeMockToken')/it('should decode valid token')`: Parse generated token
- [ ] `describe('decodeMockToken')/it('should return null for malformed token')`: Test with "not.a.token"
- [ ] `describe('decodeMockToken')/it('should return null for token with invalid base64')`: Test edge case
- [ ] `describe('decodeMockToken')/it('should return null for token missing required fields')`: Test partial payload
- [ ] `describe('isTokenExpired')/it('should return false for valid non-expired token')`: Fresh token test
- [ ] `describe('isTokenExpired')/it('should return true for expired token')`: Create token with past exp
- [ ] `describe('isTokenExpired')/it('should return true for invalid token')`: Malformed token

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `decodeMockToken` - @param, @returns, @remarks
- [ ] `isTokenExpired` - @param, @returns

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/utils/mock-jwt.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/utils/mock-jwt.util.ts' --coverageThreshold='{"global":{"lines":90}}'
```

### Expected Output
All tests pass. Coverage meets 90% threshold.

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
2. Write tests for decode and expiration functions
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Add `decodeMockToken` function to mock-jwt.util.ts
2. Add `isTokenExpired` function
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
