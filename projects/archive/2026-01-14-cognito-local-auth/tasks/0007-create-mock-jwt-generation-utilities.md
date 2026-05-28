# Task: Create Mock JWT Generation Utilities

**Type:** Task
**Parent:** None

## Description

Create utility functions for generating mock JWT tokens for local development. These functions create tokens that look like JWTs but use `alg: "none"` and a fixed signature for easy local testing.

## Acceptance Criteria

- [ ] Utility file created at `src/auth/utils/mock-jwt.util.ts`
- [ ] `generateMockAccessToken(userId: string)` function creates access token
- [ ] `generateMockIdToken(userId: string, claims?: IdTokenClaims)` function creates ID token
- [ ] `generateMockRefreshToken(userId: string)` function creates refresh token
- [ ] Tokens follow JWT structure: header.payload.signature
- [ ] Header uses `{ alg: "none", typ: "JWT" }`
- [ ] Payload includes: `sub`, `iat`, `exp`, `token_use`, `custom:realUserId`
- [ ] Access token expires in 1 hour, ID token in 1 hour, refresh token in 30 days
- [ ] Signature is fixed string `local-dev`
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify token structure and content

## Relevant Research

From `brief.md`:
- Header: `{ alg: "none", typ: "JWT" }`
- Payload includes: `sub`, `iat`, `exp`, `token_use`, `custom:realUserId`
- Signature: `local-dev` (not cryptographically valid)

From `research.md`:
- The websocket authorizer uses `decodeJwtUnsafe()` to decode tokens in local mode
- User ID should be deterministic from identifier (for consistent local testing)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/utils/mock-jwt.util.ts`

```typescript
/**
 * @file mock-jwt.util.ts
 * @description Utilities for generating mock JWT tokens for local development
 * @module auth
 */

/** Claims included in mock ID tokens */
export interface IdTokenClaims {
  readonly email?: string;
  readonly phone_number?: string;
  readonly given_name?: string;
  readonly family_name?: string;
}

/** Payload structure for mock tokens */
export interface MockTokenPayload {
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
  readonly token_use: "access" | "id" | "refresh";
  readonly "custom:realUserId": string;
  readonly [key: string]: unknown;
}

const MOCK_SIGNATURE = "local-dev";
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
const ID_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 3600; // 30 days

/**
 * Encodes object to base64url format
 */
function base64UrlEncode(obj: object): string {
  const json = JSON.stringify(obj);
  const base64 = Buffer.from(json).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Creates JWT header for mock tokens
 */
function createHeader(): object {
  return { alg: "none", typ: "JWT" };
}

/**
 * Generates a deterministic user ID from identifier
 * @param identifier - Email or phone number
 * @returns Deterministic UUID-like string
 */
export function generateDeterministicUserId(identifier: string): string {
  // Simple hash-based approach for deterministic IDs
  const hash = identifier.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const positive = Math.abs(hash);
  return `local-user-${positive.toString(16).padStart(8, "0")}`;
}

/**
 * Generates a mock access token for local development
 * @param userId - The user ID to include in the token
 * @returns JWT-formatted access token string
 */
export function generateMockAccessToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
    token_use: "access",
    "custom:realUserId": userId,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}

/**
 * Generates a mock ID token for local development
 * @param userId - The user ID to include in the token
 * @param claims - Optional additional claims (email, phone, name)
 * @returns JWT-formatted ID token string
 */
export function generateMockIdToken(
  userId: string,
  claims?: IdTokenClaims
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + ID_TOKEN_EXPIRY_SECONDS,
    token_use: "id",
    "custom:realUserId": userId,
    ...claims,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}

/**
 * Generates a mock refresh token for local development
 * @param userId - The user ID to include in the token
 * @returns JWT-formatted refresh token string
 */
export function generateMockRefreshToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    sub: `local-sub-${userId}`,
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
    token_use: "refresh",
    "custom:realUserId": userId,
  };

  const header = base64UrlEncode(createHeader());
  const body = base64UrlEncode(payload);
  return `${header}.${body}.${MOCK_SIGNATURE}`;
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/utils/mock-jwt.util.test.ts`:
- [ ] `describe('generateMockAccessToken')/it('should create valid JWT structure')`: token.split('.').length === 3
- [ ] `describe('generateMockAccessToken')/it('should have alg none in header')`: Verify header content
- [ ] `describe('generateMockAccessToken')/it('should include userId in payload')`: Verify custom:realUserId
- [ ] `describe('generateMockAccessToken')/it('should set token_use to access')`: Verify token type
- [ ] `describe('generateMockAccessToken')/it('should have 1 hour expiry')`: exp - iat === 3600
- [ ] `describe('generateMockIdToken')/it('should include custom claims')`: Verify claims are in payload
- [ ] `describe('generateMockIdToken')/it('should set token_use to id')`: Verify token type
- [ ] `describe('generateMockRefreshToken')/it('should have 30 day expiry')`: exp - iat === 30*24*3600
- [ ] `describe('generateMockRefreshToken')/it('should set token_use to refresh')`: Verify token type
- [ ] `describe('generateDeterministicUserId')/it('should return same ID for same identifier')`: Deterministic test

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `IdTokenClaims` interface - @description
- [ ] `MockTokenPayload` interface - @description
- [ ] `generateDeterministicUserId` - @param, @returns
- [ ] `generateMockAccessToken` - @param, @returns
- [ ] `generateMockIdToken` - @param, @returns
- [ ] `generateMockRefreshToken` - @param, @returns

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
All tests pass. Coverage meets 90% threshold (utility functions should have high coverage).

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

1. Create test file
2. Write tests for all utility functions
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/auth/utils/` directory if not exists
2. Create mock-jwt.util.ts with all functions
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
