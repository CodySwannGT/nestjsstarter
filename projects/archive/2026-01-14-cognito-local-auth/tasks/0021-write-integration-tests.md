# Task: Write Integration Tests for Local Auth Flow

**Type:** Task
**Parent:** None

## Description

Write integration tests that verify the complete local authentication flow works end-to-end. Tests should cover the full sign-in, confirm, refresh, and sign-out cycle using the local auth service.

## Acceptance Criteria

- [ ] Integration test file created at `src/auth/auth.integration.test.ts`
- [ ] Tests run with `IS_OFFLINE=true` environment variable
- [ ] Test complete sign-in flow with magic OTP `000000`
- [ ] Test sign-in failure with wrong OTP
- [ ] Test token refresh flow
- [ ] Test sign-out flow
- [ ] Test resend OTP flow
- [ ] Tests verify correct service is injected (LocalAuthService)
- [ ] All tests pass
- [ ] Build and lint pass

## Relevant Research

From `brief.md` task 11:
```typescript
describe("Local Auth Flow", () => {
  beforeAll(() => {
    process.env.IS_OFFLINE = "true";
  });

  it("should complete full auth flow with magic code", async () => {
    // 1. Sign in
    const signInResult = await resolver.signIn({ identifier: "+15551234567" });
    expect(signInResult.data.Session).toBeDefined();

    // 2. Confirm with magic code
    const confirmResult = await resolver.confirmSignIn({
      identifier: "+15551234567",
      session: signInResult.data.Session,
      otpCode: "000000",
    });
    expect(confirmResult.authResult.data.accessToken).toBeDefined();
  });
});
```

From `research.md` - Integration test patterns:
- Location: `src/**/*.integration.test.ts`
- Use `beforeAll` for module setup, `afterAll` for teardown
- Use `Test.createTestingModule()` for NestJS testing

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For NestJS testing patterns

## Implementation Details

### File: `src/auth/auth.integration.test.ts`

```typescript
/**
 * @file auth.integration.test.ts
 * @description Integration tests for local authentication flow
 * @module auth
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth.module";
import { AuthResolver } from "./auth.resolver";
import { AUTH_SERVICE } from "./providers/auth-service.provider";
import { IAuthService } from "./interfaces/auth-service.interface";
import { LocalAuthService } from "./services/local-auth.service";

describe("Local Auth Flow Integration", () => {
  const originalEnv = process.env.IS_OFFLINE;
  const testIdentifier = "+15551234567";
  const magicOtp = "000000";

  let module: TestingModule;
  let resolver: AuthResolver;
  let authService: IAuthService;

  beforeAll(async () => {
    process.env.IS_OFFLINE = "true";

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ IS_OFFLINE: "true" })],
        }),
        AuthModule,
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<IAuthService>(AUTH_SERVICE);
  });

  afterAll(async () => {
    process.env.IS_OFFLINE = originalEnv;
    await module?.close();
  });

  describe("Service Selection", () => {
    it("should inject LocalAuthService when IS_OFFLINE=true", () => {
      expect(authService).toBeInstanceOf(LocalAuthService);
    });
  });

  describe("Sign-In Flow", () => {
    it("should return challenge with session on sign-in", async () => {
      const result = await resolver.signIn({ identifier: testIdentifier });

      expect(result.message).toBe("Code sent");
      expect(result.data.ChallengeName).toBe("CUSTOM_CHALLENGE");
      expect(result.data.Session).toBeDefined();
      expect(result.data.Session).toMatch(/^local-session-/);
    });
  });

  describe("Confirm Sign-In Flow", () => {
    it("should succeed with magic OTP 000000", async () => {
      // Sign in first
      const signInResult = await resolver.signIn({ identifier: testIdentifier });
      const session = signInResult.data.Session!;

      // Confirm with magic OTP
      const mockContext = { req: {} } as { req: Request };
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session,
          otpCode: magicOtp,
        },
        mockContext
      );

      expect(confirmResult.errorMessage).toBeUndefined();
      expect(confirmResult.authResult).toBeDefined();
      expect(confirmResult.authResult?.data?.accessToken).toBeDefined();
      expect(confirmResult.authResult?.data?.refreshToken).toBeDefined();
      expect(confirmResult.authResult?.data?.idToken).toBeDefined();
    });

    it("should fail with incorrect OTP and show attempts remaining", async () => {
      const signInResult = await resolver.signIn({ identifier: testIdentifier });
      const session = signInResult.data.Session!;

      const mockContext = { req: {} } as { req: Request };
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session,
          otpCode: "123456", // Wrong code
        },
        mockContext
      );

      expect(confirmResult.authResult).toBeUndefined();
      expect(confirmResult.signInResult).toBeDefined();
      expect(confirmResult.signInResult?.message).toContain("attempts left");
    });

    it("should fail with invalid session", async () => {
      const mockContext = { req: {} } as { req: Request };
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session: "invalid-session-id",
          otpCode: magicOtp,
        },
        mockContext
      );

      expect(confirmResult.errorMessage).toBeDefined();
      expect(confirmResult.errorMessage?.message).toContain("Invalid");
    });
  });

  describe("Token Refresh Flow", () => {
    it("should refresh tokens with valid refresh token", async () => {
      // Complete sign-in first
      const signInResult = await resolver.signIn({ identifier: testIdentifier });
      const mockContext = { req: {} } as { req: Request };
      const confirmResult = await resolver.confirmSignIn(
        {
          identifier: testIdentifier,
          session: signInResult.data.Session!,
          otpCode: magicOtp,
        },
        mockContext
      );

      const refreshToken = confirmResult.authResult!.data!.refreshToken!;

      // Refresh tokens
      const refreshResult = await resolver.refreshToken({ refreshToken });

      expect(refreshResult.message).toBe("Token refreshed");
      expect(refreshResult.data?.accessToken).toBeDefined();
      expect(refreshResult.data?.idToken).toBeDefined();
    });
  });

  describe("Sign-Out Flow", () => {
    it("should return success message on sign-out", async () => {
      const mockContext = { req: {} } as { req: Request };
      const result = await resolver.signOut("any-token", mockContext);

      expect(result.message).toBe("Sign out successful.");
    });
  });

  describe("Resend OTP Flow", () => {
    it("should return new session on resend OTP", async () => {
      const result = await resolver.resendOTP({ identifier: testIdentifier });

      expect(result.message).toBe("Code sent");
      expect(result.data.Session).toBeDefined();
    });
  });
});
```

## Testing Requirements

### Unit Tests
N/A - This is the integration test task

### Integration Tests
This task creates the integration tests.

### E2E Tests
N/A - Integration tests cover the flow

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File-level JSDoc with @file, @description, @module
- [ ] Describe blocks have clear descriptions

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test:integration -- --testPathPattern="src/auth/auth\\.integration\\.test\\.ts"
```

### Expected Output
All integration tests pass.

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

Skip - this task IS writing tests, which may fail until all previous tasks complete.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create auth.integration.test.ts
2. Write all test scenarios
3. Run tests (may require previous tasks to be complete)

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, check that all previous tasks are complete

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
