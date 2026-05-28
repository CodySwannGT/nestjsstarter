# Task: Create CognitoService for Production Authentication

**Type:** Task
**Parent:** None

## Description

Create the `CognitoService` that wraps AWS Cognito SDK calls for production authentication. This service handles direct communication with AWS Cognito for user authentication operations.

## Acceptance Criteria

- [ ] Service file created at `src/auth/services/cognito.service.ts`
- [ ] Service is decorated with `@Injectable()`
- [ ] Service uses `CognitoIdentityProviderClient` from `@aws-sdk/client-cognito-identity-provider`
- [ ] Implements methods for: `initiateAuthCustom`, `respondToAuthChallenge`, `refreshToken`, `globalSignOut`
- [ ] Helper methods: `createSignInResult`, `createConfirmSignInResult`, `handleErrorConfirmSignin`
- [ ] Uses NestJS ConfigService for Cognito configuration
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests with mocked Cognito client

## Relevant Research

From reference implementation at `src/cognito/cognito.service.ts`:
- Uses `CognitoIdentityProviderClient` with commands
- Has `initiateAuthCustom`, `respondToAuthChallenge`, `refreshToken`, `globalSignOut`
- Uses `@Inject(cognito.KEY)` for config injection

From `research.md`:
- Open Question Q3 Answer: "Use NestJS ConfigService for environment detection"
- Package `@aws-sdk/client-cognito-identity-provider` needs to be added

**Note**: This project may not have all AWS SDK dependencies. Check package.json and add if needed.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS service patterns

## Implementation Details

### Install AWS SDK (if not present)
```bash
bun add @aws-sdk/client-cognito-identity-provider
```

### File: `src/auth/services/cognito.service.ts`

```typescript
/**
 * @file cognito.service.ts
 * @description Service for AWS Cognito authentication operations
 * @module auth
 */

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminInitiateAuthCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";
import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { SignInResult } from "../types/sign-in-result.type";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { Message } from "../types/message.type";

/**
 * Service for AWS Cognito authentication
 * @description Handles direct communication with AWS Cognito for authentication
 */
@Injectable()
export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: this.configService.get<string>("AWS_REGION", "us-east-1"),
    });
    this.userPoolId = this.configService.get<string>("COGNITO_USER_POOL_ID", "");
    this.clientId = this.configService.get<string>("COGNITO_CLIENT_ID", "");
  }

  /**
   * Initiates custom auth flow with Cognito
   * @param identifier - Email or phone number
   * @returns Cognito auth response
   */
  async initiateAuthCustom(identifier: string) {
    const command = new InitiateAuthCommand({
      ClientId: this.clientId,
      AuthFlow: AuthFlowType.CUSTOM_AUTH,
      AuthParameters: {
        USERNAME: identifier,
      },
    });
    return this.client.send(command);
  }

  /**
   * Responds to auth challenge (OTP verification)
   * @param input - Challenge response input
   * @returns Cognito auth response
   */
  async respondToAuthChallenge(input: ConfirmSignInInput) {
    const command = new RespondToAuthChallengeCommand({
      ClientId: this.clientId,
      ChallengeName: ChallengeNameType.CUSTOM_CHALLENGE,
      Session: input.session,
      ChallengeResponses: {
        ANSWER: input.otpCode,
        USERNAME: input.identifier,
      },
    });
    return this.client.send(command);
  }

  /**
   * Refreshes authentication tokens
   * @param refreshToken - Valid refresh token
   * @returns New authentication tokens
   */
  async refreshToken(refreshToken: string) {
    const command = new AdminInitiateAuthCommand({
      UserPoolId: this.userPoolId,
      ClientId: this.clientId,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });
    return this.client.send(command);
  }

  /**
   * Signs out user globally
   * @param accessToken - User's access token
   */
  async globalSignOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });
    await this.client.send(command);
  }

  /**
   * Creates SignInResult from Cognito response
   * @param message - Status message
   * @param result - Cognito auth response
   * @returns Formatted sign-in result
   */
  createSignInResult(message: string, result: { ChallengeName?: string; Session?: string; ChallengeParameters?: Record<string, string> }): SignInResult {
    return {
      message,
      data: {
        ChallengeName: result.ChallengeName,
        Session: result.Session,
        ChallengeParameters: result.ChallengeParameters || {},
      },
    };
  }

  /**
   * Creates AuthenticationResultWithMessage from Cognito response
   * @param message - Status message
   * @param result - Cognito auth response
   * @returns Formatted auth result
   */
  createConfirmSignInResult(message: string, result: { AuthenticationResult?: { AccessToken?: string; ExpiresIn?: number; TokenType?: string; RefreshToken?: string; IdToken?: string } }): AuthenticationResultWithMessage {
    return {
      message,
      data: result.AuthenticationResult ? {
        accessToken: result.AuthenticationResult.AccessToken,
        expiresIn: result.AuthenticationResult.ExpiresIn,
        tokenType: result.AuthenticationResult.TokenType,
        refreshToken: result.AuthenticationResult.RefreshToken,
        idToken: result.AuthenticationResult.IdToken,
      } : undefined,
    };
  }

  /**
   * Handles errors from confirm sign-in
   * @param error - Error from Cognito
   * @returns Formatted error message
   */
  handleErrorConfirmSignin(error: Error): Message {
    if (error.message === "Invalid session for the user.") {
      return { message: "Your login session has expired. Please log in again." };
    }
    if (error.message === "Incorrect username or password.") {
      return { message: "The verification code is not valid, please request a new one." };
    }
    throw error;
  }
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/services/cognito.service.test.ts`:
- [ ] `describe('CognitoService')/it('should be defined')`: Service instantiation
- [ ] `describe('initiateAuthCustom')/it('should call InitiateAuthCommand')`: Mock verification
- [ ] `describe('respondToAuthChallenge')/it('should call RespondToAuthChallengeCommand')`: Mock verification
- [ ] `describe('refreshToken')/it('should call AdminInitiateAuthCommand')`: Mock verification
- [ ] `describe('globalSignOut')/it('should call GlobalSignOutCommand')`: Mock verification
- [ ] `describe('createSignInResult')/it('should format result correctly')`: Output structure
- [ ] `describe('createConfirmSignInResult')/it('should format auth result correctly')`: Output structure
- [ ] `describe('handleErrorConfirmSignin')/it('should handle session expired error')`: Error mapping

### Integration Tests
N/A - requires live Cognito

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `CognitoService` class - @description
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
bun run test -- --testPathPattern="src/auth/services/cognito.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/services/cognito.service.ts' --coverageThreshold='{"global":{"lines":70}}'
```

### Expected Output
All tests pass. Coverage meets 70% threshold (some branches hard to test without live Cognito).

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

1. Install AWS SDK if needed: `bun add @aws-sdk/client-cognito-identity-provider`
2. Create test file with mocked Cognito client
3. Write tests for all methods
4. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create cognito.service.ts
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
