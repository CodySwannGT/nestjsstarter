# Task: Create JWT Validation Guard for HTTP Requests

**Type:** Task
**Parent:** None

## Description

Create a NestJS guard that validates JWT tokens on HTTP requests. The guard checks `IS_OFFLINE` to determine whether to use local mock token validation or production Cognito verification.

## Acceptance Criteria

- [ ] Guard file created at `src/auth/guards/jwt-auth.guard.ts`
- [ ] Guard implements `CanActivate` interface
- [ ] Uses `ConfigService` to check `IS_OFFLINE`
- [ ] In local mode: uses `decodeMockToken` and `isTokenExpired` from mock-jwt utilities
- [ ] In production mode: uses `aws-jwt-verify` for Cognito token verification
- [ ] Extracts token from `Authorization: Bearer <token>` header
- [ ] Sets `request.user` with user ID and sub from token
- [ ] Returns false for missing, invalid, or expired tokens
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify both local and production paths

## Relevant Research

From `brief.md` task 7:
```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const isOffline = this.configService.get("IS_OFFLINE") === "true";
  if (isOffline) {
    return this.validateLocalToken(token, request);
  }
  return this.validateCognitoToken(token, request);
}
```

From `research.md` - websocket authorizer pattern (`src/websocket/authorizer/ws-authorizer.handler.ts:84-101`):
- Uses `CognitoJwtVerifier` from `aws-jwt-verify` for production
- Uses `decodeJwtUnsafe()` for local development
- Checks expiration even in local mode
- Extracts `sub`, `cognito:groups`, `email` from payload

From existing package.json: `aws-jwt-verify` is already a dependency.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS guard patterns

## Implementation Details

### File: `src/auth/guards/jwt-auth.guard.ts`

```typescript
/**
 * @file jwt-auth.guard.ts
 * @description NestJS guard for JWT token validation
 * @module auth
 */

import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GqlExecutionContext } from "@nestjs/graphql";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request } from "express";
import { decodeMockToken, isTokenExpired } from "../utils/mock-jwt.util";

/** User data extracted from JWT */
interface JwtUser {
  readonly id: string;
  readonly sub: string;
  readonly groups?: readonly string[];
}

/**
 * Guard for validating JWT tokens on HTTP requests
 * @description Validates local mock tokens or Cognito tokens based on environment
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Determines if request can proceed based on JWT validation
   * @param context - Execution context
   * @returns true if token is valid, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req as Request & { user?: JwtUser };

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);
    const isOffline = this.configService.get<string>("IS_OFFLINE") === "true";

    if (isOffline) {
      return this.validateLocalToken(token, request);
    }

    return this.validateCognitoToken(token, request);
  }

  /**
   * Validates mock JWT token for local development
   * @param token - JWT token string
   * @param request - Express request to attach user
   * @returns true if token is valid
   */
  private validateLocalToken(token: string, request: Request & { user?: JwtUser }): boolean {
    const payload = decodeMockToken(token);
    if (!payload) {
      return false;
    }

    if (isTokenExpired(token)) {
      return false;
    }

    request.user = {
      id: payload["custom:realUserId"] as string,
      sub: payload.sub,
    };

    return true;
  }

  /**
   * Validates Cognito JWT token for production
   * @param token - JWT token string
   * @param request - Express request to attach user
   * @returns true if token is valid
   */
  private async validateCognitoToken(
    token: string,
    request: Request & { user?: JwtUser }
  ): Promise<boolean> {
    try {
      const verifier = this.getCognitoVerifier();
      const payload = await verifier.verify(token);

      request.user = {
        id: (payload["custom:realUserId"] as string) || payload.sub,
        sub: payload.sub,
        groups: payload["cognito:groups"] as readonly string[] | undefined,
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets or creates Cognito JWT verifier
   * @returns Configured Cognito verifier
   */
  private getCognitoVerifier() {
    if (!this.cognitoVerifier) {
      this.cognitoVerifier = CognitoJwtVerifier.create({
        userPoolId: this.configService.get<string>("COGNITO_USER_POOL_ID", ""),
        clientId: this.configService.get<string>("COGNITO_CLIENT_ID", ""),
        tokenUse: "access",
      });
    }
    return this.cognitoVerifier;
  }
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/guards/jwt-auth.guard.test.ts`:
- [ ] `describe('JwtAuthGuard')/it('should be defined')`: Guard instantiation
- [ ] `describe('canActivate')/it('should return false for missing Authorization header')`: No header
- [ ] `describe('canActivate')/it('should return false for non-Bearer token')`: Wrong scheme
- [ ] `describe('canActivate - local mode')/it('should validate mock token')`: IS_OFFLINE=true, valid token
- [ ] `describe('canActivate - local mode')/it('should return false for invalid mock token')`: Malformed token
- [ ] `describe('canActivate - local mode')/it('should return false for expired mock token')`: Expired token
- [ ] `describe('canActivate - local mode')/it('should set request.user with id and sub')`: User extraction
- [ ] `describe('canActivate - production mode')/it('should use Cognito verifier')`: Mock Cognito

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - will be tested via GraphQL

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `JwtUser` interface - comment
- [ ] `JwtAuthGuard` class - @description
- [ ] `canActivate` - @param, @returns
- [ ] `validateLocalToken` - @param, @returns
- [ ] `validateCognitoToken` - @param, @returns
- [ ] `getCognitoVerifier` - @returns

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no direct GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/guards/.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/guards/*.ts' --coverageThreshold='{"global":{"lines":75}}'
```

### Expected Output
All tests pass. Coverage meets 75% threshold (some Cognito paths hard to test without live service).

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

1. Create test file with mocked ConfigService and execution context
2. Write tests for both local and production validation paths
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/auth/guards/` directory if not exists
2. Create jwt-auth.guard.ts
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
