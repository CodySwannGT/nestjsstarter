# Task: Create Auth Resolver with GraphQL Mutations

**Type:** Task
**Parent:** None

## Description

Create the `AuthResolver` that exposes authentication mutations via GraphQL. The resolver injects the auth service via the `AUTH_SERVICE` token and delegates to whichever implementation (local or production) is provided.

## Acceptance Criteria

- [ ] Resolver file created at `src/auth/auth.resolver.ts`
- [ ] Resolver decorated with `@Resolver(() => String)`
- [ ] Injects auth service via `@Inject(AUTH_SERVICE)`
- [ ] Implements mutations: `signIn`, `confirmSignIn`, `resendOTP`, `refreshToken`, `signOut`
- [ ] All mutations decorated with `@Public()` (auth endpoints are publicly accessible)
- [ ] All mutations have proper descriptions
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify resolver delegation

## Relevant Research

From reference implementation at `src/auth/auth.resolver.ts`:
- Uses `@Resolver(() => String)` decorator
- Injects service via constructor
- Uses `@Public()` decorator from auth decorators
- Uses `@Context()` to get request for confirmSignIn and signOut
- Uses `@GraphQLHeaders("authorization")` for signOut to get access token

From `research.md` - Hello resolver pattern:
```typescript
@Resolver()
export class HelloResolver {
  constructor(private readonly helloService: HelloService) {}

  @Query(() => String, { description: "..." })
  @Public()
  hello(): string { ... }
}
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-graphql` - For GraphQL resolver patterns
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/auth.resolver.ts`

```typescript
/**
 * @file auth.resolver.ts
 * @description GraphQL resolver for authentication operations
 * @module auth
 */

import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { Inject } from "@nestjs/common";
import { Request } from "express";
import { Public } from "./decorators";
import { AUTH_SERVICE } from "./providers/auth-service.provider";
import { IAuthService } from "./interfaces/auth-service.interface";
import { SignInInput } from "./inputs/sign-in.input";
import { ConfirmSignInInput } from "./inputs/confirm-sign-in.input";
import { RefreshTokenInput } from "./inputs/refresh-token.input";
import { ResendOtpInput } from "./inputs/resend-otp.input";
import { SignInResult } from "./types/sign-in-result.type";
import { ConfirmSignInResult } from "./types/confirm-sign-in-result.type";
import { AuthenticationResultWithMessage } from "./types/authentication-result-with-message.type";
import { Message } from "./types/message.type";

/**
 * GraphQL interface for request context
 */
interface GraphQLContext {
  readonly req: Request;
}

/**
 * GraphQL resolver for authentication
 * @description Exposes authentication mutations for sign-in, sign-out, and token refresh
 */
@Resolver(() => String)
export class AuthResolver {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService
  ) {}

  /**
   * Initiates sign-in process
   * @param input - Sign-in input with identifier
   * @returns Sign-in result with challenge
   */
  @Mutation(() => SignInResult, {
    name: "signIn",
    description: "Initiates sign-in process by sending OTP to user",
  })
  @Public()
  async signIn(@Args("input") input: SignInInput): Promise<SignInResult> {
    return this.authService.signIn(input);
  }

  /**
   * Confirms sign-in with OTP
   * @param input - Confirmation input with OTP and session
   * @param context - GraphQL context with request
   * @returns Confirmation result with tokens or error
   */
  @Mutation(() => ConfirmSignInResult, {
    name: "confirmSignIn",
    description: "Confirms sign-in by verifying OTP code",
  })
  @Public()
  async confirmSignIn(
    @Args("input") input: ConfirmSignInInput,
    @Context() context: GraphQLContext
  ): Promise<ConfirmSignInResult> {
    return this.authService.confirmSignIn(input, context.req);
  }

  /**
   * Resends OTP code
   * @param input - Resend input with identifier
   * @returns Sign-in result with new challenge
   */
  @Mutation(() => SignInResult, {
    name: "resendOTP",
    description: "Resends OTP code to user",
  })
  @Public()
  async resendOTP(@Args("input") input: ResendOtpInput): Promise<SignInResult> {
    return this.authService.resendOTP(input);
  }

  /**
   * Refreshes authentication tokens
   * @param input - Refresh token input
   * @returns New authentication tokens
   */
  @Mutation(() => AuthenticationResultWithMessage, {
    name: "refreshToken",
    description: "Refreshes authentication tokens using refresh token",
  })
  @Public()
  async refreshToken(
    @Args("input") input: RefreshTokenInput
  ): Promise<AuthenticationResultWithMessage> {
    return this.authService.refreshToken(input);
  }

  /**
   * Signs out user
   * @param accessToken - Access token from Authorization header
   * @param context - GraphQL context with request
   * @returns Success message
   */
  @Mutation(() => Message, {
    name: "signOut",
    description: "Signs out user from current session",
  })
  @Public()
  async signOut(
    @Args("accessToken") accessToken: string,
    @Context() context: GraphQLContext
  ): Promise<Message> {
    return this.authService.signOut(accessToken, context.req);
  }
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/auth.resolver.test.ts`:
- [ ] `describe('AuthResolver')/it('should be defined')`: Resolver instantiation
- [ ] `describe('signIn')/it('should delegate to authService.signIn')`: Mock verification
- [ ] `describe('confirmSignIn')/it('should delegate to authService.confirmSignIn')`: Mock verification
- [ ] `describe('confirmSignIn')/it('should pass context.req to service')`: Request passed
- [ ] `describe('resendOTP')/it('should delegate to authService.resendOTP')`: Mock verification
- [ ] `describe('refreshToken')/it('should delegate to authService.refreshToken')`: Mock verification
- [ ] `describe('signOut')/it('should delegate to authService.signOut')`: Mock verification

### Integration Tests
N/A - will be tested in integration task

### E2E Tests
N/A - no user-facing changes yet

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] `AuthResolver` class - @description
- [ ] All mutation methods - @param, @returns

### Database Comments
N/A - no database changes

### GraphQL Descriptions
- [ ] `signIn` mutation - description in decorator
- [ ] `confirmSignIn` mutation - description in decorator
- [ ] `resendOTP` mutation - description in decorator
- [ ] `refreshToken` mutation - description in decorator
- [ ] `signOut` mutation - description in decorator

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/auth\\.resolver.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/auth.resolver.ts' --coverageThreshold='{"global":{"lines":80}}'
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

1. Create test file with mocked auth service
2. Write tests for all mutation methods
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create auth.resolver.ts
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
