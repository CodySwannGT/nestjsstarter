# Task: Create LocalAuthService with signIn Method

**Type:** Task
**Parent:** None

## Description

Create the `LocalAuthService` class with the `signIn` method. This service provides a local authentication facade that bypasses AWS Cognito during local development. The `signIn` method creates a local session and returns a challenge for OTP verification.

## Acceptance Criteria

- [ ] Service file created at `src/auth/services/local-auth.service.ts`
- [ ] Service is decorated with `@Injectable()`
- [ ] Service uses in-memory `Map` for session storage
- [ ] `signIn` method accepts `SignInInput` and returns `Promise<SignInResult>`
- [ ] Session ID format: `local-session-{timestamp}-{random}`
- [ ] Session stores: identifier, createdAt timestamp, attempts count (0)
- [ ] Returns challenge result with session ID
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify session creation and return structure

## Relevant Research

From `brief.md`:
- Store sessions in `Map<sessionId, LocalSession>`
- Session IDs: `local-session-{timestamp}-{random}`
- Interface `LocalSession { identifier: string; createdAt: number; attempts: number; }`

From `research.md`:
- Open Question Q1 Answer: "In-memory storage is sufficient for local development"
- Follow provider pattern from `src/subscription/subscription.module.ts`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns
- `/nestjs-graphql` - For understanding the auth flow

## Implementation Details

### File: `src/auth/services/local-auth.service.ts`

```typescript
/**
 * @file local-auth.service.ts
 * @description Local authentication service for development without Cognito
 * @module auth
 */

import { Injectable } from "@nestjs/common";
import { SignInInput } from "../inputs/sign-in.input";
import { SignInResult } from "../types/sign-in-result.type";
import { IAuthService } from "../interfaces/auth-service.interface";

/** Local session data stored in memory */
interface LocalSession {
  readonly identifier: string;
  readonly createdAt: number;
  readonly attempts: number;
}

/** Maximum OTP verification attempts allowed */
const MAX_ATTEMPTS = 3;

/**
 * Local authentication service for development
 * @description Provides authentication without AWS Cognito for local development
 * @remarks Sessions are stored in-memory and lost on server restart
 */
@Injectable()
export class LocalAuthService implements Partial<IAuthService> {
  private readonly sessions = new Map<string, LocalSession>();

  /**
   * Generates a unique session ID
   * @returns Session ID in format local-session-{timestamp}-{random}
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `local-session-${timestamp}-${random}`;
  }

  /**
   * Initiates sign-in process by creating a local session
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge data
   */
  async signIn(input: SignInInput): Promise<SignInResult> {
    const { identifier } = input;
    const sessionId = this.generateSessionId();

    const session: LocalSession = {
      identifier,
      createdAt: Date.now(),
      attempts: 0,
    };

    this.sessions.set(sessionId, session);

    return {
      message: "Code sent",
      data: {
        ChallengeName: "CUSTOM_CHALLENGE",
        Session: sessionId,
        ChallengeParameters: {
          USERNAME: identifier,
          maxAttempts: String(MAX_ATTEMPTS),
          attemptsLeft: String(MAX_ATTEMPTS),
        },
      },
    };
  }
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/services/local-auth.service.test.ts`:
- [ ] `describe('LocalAuthService')/it('should be defined')`: Service instantiation
- [ ] `describe('signIn')/it('should return SignInResult with session')`: Verify structure
- [ ] `describe('signIn')/it('should create unique session IDs')`: Multiple calls have different IDs
- [ ] `describe('signIn')/it('should include identifier in challenge parameters')`: USERNAME matches input
- [ ] `describe('signIn')/it('should set maxAttempts to 3')`: Verify attempt limit
- [ ] `describe('signIn')/it('should return CUSTOM_CHALLENGE as ChallengeName')`: Verify challenge type

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `LocalSession` interface - comment
- [ ] `LocalAuthService` class - @description, @remarks
- [ ] `generateSessionId` - @returns
- [ ] `signIn` - @param, @returns

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

1. Create test file with NestJS testing utilities
2. Write tests for signIn method
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/auth/services/` directory if not exists
2. Create local-auth.service.ts with signIn method
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
