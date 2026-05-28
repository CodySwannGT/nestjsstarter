# Task: Create Auth Service Interface

**Type:** Task
**Parent:** None

## Description

Create the `IAuthService` interface that defines the contract for both `AuthService` (production Cognito) and `LocalAuthService` (local development). This interface ensures both implementations provide the same public API.

## Acceptance Criteria

- [ ] Interface file created at `src/auth/interfaces/auth-service.interface.ts`
- [ ] Interface defines `signIn`, `confirmSignIn`, `refreshToken`, `signOut`, and `resendOTP` methods
- [ ] All method signatures match the GraphQL resolver requirements
- [ ] Interface uses proper input/output types (to be created in subsequent tasks)
- [ ] JSDoc documentation follows codebase conventions

## Relevant Research

From `research.md`:
- The existing `src/auth/` module provides authorization decorators, not authentication
- No existing auth service interface exists in the codebase
- Reference implementation at `src/auth/` shows the method signatures:
  - `signIn(input: SignInInput): Promise<SignInResult>`
  - `confirmSignIn(input: ConfirmSignInInput, request?: Request): Promise<ConfirmSignInResult>`
  - `refreshToken(input: RefreshTokenInput): Promise<AuthenticationResultWithMessage>`
  - `signOut(accessToken: string, request?: Request): Promise<Message>`
  - `resendOTP(input: ResendOtpInput): Promise<SignInResult>`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS module/service patterns

## Implementation Details

Create the file at `src/auth/interfaces/auth-service.interface.ts`:

```typescript
/**
 * @file auth-service.interface.ts
 * @description Interface for authentication services (Cognito and Local)
 * @module auth
 */

import { Request } from "express";
import { ConfirmSignInInput } from "../inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "../inputs/refresh-token.input";
import { ResendOtpInput } from "../inputs/resend-otp.input";
import { SignInInput } from "../inputs/sign-in.input";
import { AuthenticationResultWithMessage } from "../types/authentication-result-with-message.type";
import { ConfirmSignInResult } from "../types/confirm-sign-in-result.type";
import { Message } from "../types/message.type";
import { SignInResult } from "../types/sign-in-result.type";

/**
 * Interface for authentication services
 * @description Defines the contract for both Cognito and Local auth implementations
 */
export interface IAuthService {
  signIn(input: SignInInput): Promise<SignInResult>;
  confirmSignIn(input: ConfirmSignInInput, request?: Request): Promise<ConfirmSignInResult>;
  refreshToken(input: RefreshTokenInput): Promise<AuthenticationResultWithMessage>;
  signOut(accessToken: string, request?: Request): Promise<Message>;
  resendOTP(input: ResendOtpInput): Promise<SignInResult>;
}
```

Note: The actual import paths will be adjusted once the type files are created.

## Testing Requirements

### Unit Tests
N/A - Interfaces don't have runtime behavior to test

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `IAuthService` - @description explaining the interface purpose
- [ ] Each method - @param and @returns documentation

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
test -f src/auth/interfaces/auth-service.interface.ts && bun run build
```

### Expected Output
No TypeScript compilation errors. File exists at the specified path.

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

Skip - interfaces don't have runtime behavior to test.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create directory `src/auth/interfaces/` if it doesn't exist
2. Create the interface file with JSDoc documentation
3. Use placeholder import paths (types will be created in subsequent tasks)

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
