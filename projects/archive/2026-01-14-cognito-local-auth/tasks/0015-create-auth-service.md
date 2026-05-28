# Task: Create AuthService that Wraps CognitoService

**Type:** Task
**Parent:** None

## Description

Create the `AuthService` that implements `IAuthService` and wraps `CognitoService` for production authentication. This service orchestrates the authentication flow using Cognito as the backend.

## Acceptance Criteria

- [ ] Service file created at `src/auth/services/auth.service.ts`
- [ ] Service is decorated with `@Injectable()`
- [ ] Service implements `IAuthService` interface
- [ ] Service injects `CognitoService` for Cognito operations
- [ ] Implements all 5 methods: `signIn`, `confirmSignIn`, `refreshToken`, `signOut`, `resendOTP`
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests with mocked CognitoService

## Relevant Research

From reference implementation at `src/auth/auth.service.ts`:
- Injects `CognitoService` and delegates to it
- `signIn` calls `cognitoService.initiateAuthCustom`
- `confirmSignIn` calls `cognitoService.respondToAuthChallenge`
- `refreshToken` calls `cognitoService.refreshToken`
- `signOut` calls `cognitoService.globalSignOut`
- `resendOTP` delegates to `signIn`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

### File: `src/auth/services/auth.service.ts`

```typescript
/**
 * @file auth.service.ts
 * @description Production authentication service using AWS Cognito
 * @module auth
 */

import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { CognitoService } from "./cognito.service";
import { IAuthService } from "../interfaces/auth-service.interface";
import { SignInInput } from "../inputs/sign-in.input";
import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "../inputs/refresh-token.input";
import { ResendOtpInput } from "../inputs/resend-otp.input";
import { SignInResult } from "../types/sign-in-result.type";
import { ConfirmSignInResult } from "../types/confirm-sign-in-result.type";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { Message } from "../types/message.type";

/**
 * Production authentication service
 * @description Implements authentication using AWS Cognito
 */
@Injectable()
export class AuthService implements IAuthService {
  constructor(private readonly cognitoService: CognitoService) {}

  /**
   * Initiates sign-in process
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge
   */
  async signIn(input: SignInInput): Promise<SignInResult> {
    const result = await this.cognitoService.initiateAuthCustom(input.identifier);
    return this.cognitoService.createSignInResult("Code sent", result);
  }

  /**
   * Confirms sign-in with OTP verification
   * @param input - Confirmation input with OTP
   * @param _request - Express request (unused, for interface compatibility)
   * @returns Confirmation result with tokens or error
   */
  async confirmSignIn(input: ConfirmSignInInput, _request?: Request): Promise<ConfirmSignInResult> {
    try {
      const result = await this.cognitoService.respondToAuthChallenge(input);
      const wasSuccessful = !result.ChallengeName;

      return {
        signInResult: wasSuccessful
          ? undefined
          : this.cognitoService.createSignInResult(
              `You have ${result.ChallengeParameters?.["attemptsLeft"] || "unknown"} attempts left`,
              result
            ),
        authResult: wasSuccessful
          ? this.cognitoService.createConfirmSignInResult("Your identity has been verified", result)
          : undefined,
      };
    } catch (error) {
      return {
        errorMessage: this.cognitoService.handleErrorConfirmSignin(error as Error),
      };
    }
  }

  /**
   * Refreshes authentication tokens
   * @param input - Refresh token input
   * @returns New authentication tokens
   */
  async refreshToken(input: RefreshTokenInput): Promise<AuthenticationResultWithMessage> {
    const result = await this.cognitoService.refreshToken(input.refreshToken);
    return this.cognitoService.createConfirmSignInResult("Token refreshed", result);
  }

  /**
   * Signs out user
   * @param accessToken - User's access token
   * @param _request - Express request (unused)
   * @returns Success message
   */
  async signOut(accessToken: string, _request?: Request): Promise<Message> {
    await this.cognitoService.globalSignOut(accessToken);
    return { message: "Sign out successful." };
  }

  /**
   * Resends OTP code
   * @param input - Resend OTP input
   * @returns Sign-in result with new challenge
   */
  async resendOTP(input: ResendOtpInput): Promise<SignInResult> {
    return this.signIn(input);
  }
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/services/auth.service.test.ts`:
- [ ] `describe('AuthService')/it('should be defined')`: Service instantiation
- [ ] `describe('signIn')/it('should call cognitoService.initiateAuthCustom')`: Mock verification
- [ ] `describe('signIn')/it('should return formatted SignInResult')`: Output structure
- [ ] `describe('confirmSignIn')/it('should return authResult on success')`: Success case
- [ ] `describe('confirmSignIn')/it('should return signInResult on challenge')`: Challenge case
- [ ] `describe('confirmSignIn')/it('should return errorMessage on error')`: Error case
- [ ] `describe('refreshToken')/it('should call cognitoService.refreshToken')`: Mock verification
- [ ] `describe('signOut')/it('should call cognitoService.globalSignOut')`: Mock verification
- [ ] `describe('resendOTP')/it('should delegate to signIn')`: Delegation verification

### Integration Tests
N/A - requires live Cognito

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `AuthService` class - @description
- [ ] All public methods - @param, @returns

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no direct GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/services/auth\\.service.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/services/auth.service.ts' --coverageThreshold='{"global":{"lines":80}}'
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

1. Create test file with mocked CognitoService
2. Write tests for all methods
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create auth.service.ts
2. Run tests until they pass

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
