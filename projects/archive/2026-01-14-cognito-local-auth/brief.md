# Implementation Plan: Local Cognito Authentication Facade

## Overview

Implement a local authentication facade that bypasses AWS Cognito during local
development, enabling rapid development and testing without requiring cloud
infrastructure.

## Acceptance Criteria

- [ ] Local development uses facade service when `IS_OFFLINE=true`
- [ ] Production uses real Cognito service when `IS_OFFLINE=false`
- [ ] Sign-in accepts any valid phone number or email
- [ ] OTP code `000000` always succeeds authentication
- [ ] Any other OTP code fails with appropriate error message
- [ ] Mock JWT tokens are generated and validated locally
- [ ] Existing tests continue to pass
- [ ] No changes to GraphQL schema or client contract

---

## Tasks

### 1. Create Local Auth DTOs and Types

**File**: `src/auth/dto/local-auth.types.ts`

Define types for local session management:

```typescript
interface LocalSession {
  identifier: string;
  createdAt: number;
  attempts: number;
}
```

**Estimated complexity**: Low

---

### 2. Create Local Auth Service

**File**: `src/auth/services/local-auth.service.ts`

Implement the facade service with the following methods:

| Method | Description |
|--------|-------------|
| `signIn(input)` | Creates local session, returns challenge |
| `confirmSignIn(input)` | Validates OTP (`000000` = success) |
| `refreshToken(input)` | Returns new mock tokens |
| `signOut(accessToken)` | Clears session (no-op for local) |

**Key behaviors**:

- Store sessions in `Map<sessionId, LocalSession>`
- Session IDs: `local-session-{timestamp}-{random}`
- Magic OTP: `000000`
- Max attempts: 3
- Generate deterministic user IDs from identifier

**Estimated complexity**: Medium

---

### 3. Create Mock JWT Generator Utility

**File**: `src/auth/utils/mock-jwt.util.ts`

Utility functions for generating mock JWTs:

```typescript
function generateMockAccessToken(userId: string): string
function generateMockIdToken(userId: string, claims?: IdTokenClaims): string
function generateMockRefreshToken(userId: string): string
function decodeMockToken(token: string): TokenPayload | null
function isTokenExpired(token: string): boolean
```

**Token structure**:

- Header: `{ alg: "none", typ: "JWT" }`
- Payload includes: `sub`, `iat`, `exp`, `token_use`, `custom:realUserId`
- Signature: `local-dev` (not cryptographically valid)

**Estimated complexity**: Low

---

### 4. Create Auth Service Provider Factory

**File**: `src/auth/providers/auth-service.provider.ts`

Factory that selects the appropriate auth service:

```typescript
export const AUTH_SERVICE = "AUTH_SERVICE";

export const authServiceProvider: Provider = {
  provide: AUTH_SERVICE,
  useFactory: (
    configService: ConfigService,
    authService: AuthService,
    localAuthService: LocalAuthService
  ) => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
```

**Estimated complexity**: Low

---

### 5. Create Auth Service Interface

**File**: `src/auth/interfaces/auth-service.interface.ts`

Define interface that both services implement:

```typescript
interface IAuthService {
  signIn(input: SignInInput): Promise<SignInResult>;
  confirmSignIn(input: ConfirmSignInInput): Promise<ConfirmSignInResult>;
  refreshToken(input: RefreshTokenInput): Promise<AuthenticationResultWithMessage>;
  signOut(accessToken: string, request?: Request): Promise<Message>;
}
```

**Estimated complexity**: Low

---

### 6. Update Auth Resolver

**File**: `src/auth/auth.resolver.ts`

Modify resolver to inject via token:

```typescript
constructor(
  @Inject(AUTH_SERVICE)
  private readonly authService: IAuthService
) {}
```

**Changes**:

- Replace direct `AuthService` injection with `AUTH_SERVICE` token
- No changes to mutation signatures or return types

**Estimated complexity**: Low

---

### 7. Update JWT Validation Guard

**File**: `src/auth/guards/jwt-auth.guard.ts`

Add local token validation path:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const isOffline = this.configService.get("IS_OFFLINE") === "true";

  if (isOffline) {
    return this.validateLocalToken(token, request);
  }

  return this.validateCognitoToken(token, request);
}

private validateLocalToken(token: string, request: any): boolean {
  const payload = decodeMockToken(token);
  if (!payload || isTokenExpired(token)) {
    return false;
  }
  request.user = { id: payload["custom:realUserId"], sub: payload.sub };
  return true;
}
```

**Estimated complexity**: Medium

---

### 8. Update Auth Module

**File**: `src/auth/auth.module.ts`

Register new providers:

```typescript
@Module({
  providers: [
    AuthService,
    LocalAuthService,
    authServiceProvider,
    // ... existing providers
  ],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
```

**Estimated complexity**: Low

---

### 9. Add Environment Configuration

**File**: `.env.local` (create if not exists)

```bash
IS_OFFLINE=true
```

**File**: `src/config/app.config.ts` (or equivalent)

Ensure `IS_OFFLINE` is loaded from environment.

**Estimated complexity**: Low

---

### 10. Write Unit Tests

**Files**:

- `src/auth/services/local-auth.service.spec.ts`
- `src/auth/utils/mock-jwt.util.spec.ts`
- `src/auth/providers/auth-service.provider.spec.ts`

**Test cases for LocalAuthService**:

| Test | Expected |
|------|----------|
| `signIn` returns challenge with session | Session stored, challenge returned |
| `confirmSignIn` with `000000` succeeds | Tokens returned |
| `confirmSignIn` with wrong code fails | Error with attempts remaining |
| `confirmSignIn` with invalid session fails | Session error |
| `confirmSignIn` exhausts attempts after 3 failures | Auth fails |
| `refreshToken` returns new tokens | Valid mock tokens |

**Test cases for mock-jwt.util**:

| Test | Expected |
|------|----------|
| `generateMockAccessToken` creates valid structure | Decodable JWT |
| `generateMockIdToken` includes claims | Claims in payload |
| `decodeMockToken` parses valid token | Payload object |
| `decodeMockToken` returns null for invalid | null |
| `isTokenExpired` detects expired tokens | true/false |

**Estimated complexity**: Medium

---

### 11. Write Integration Tests

**File**: `src/auth/auth.integration.spec.ts`

Test complete flow with `IS_OFFLINE=true`:

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

  it("should fail with incorrect OTP", async () => {
    // Sign in then use wrong code
  });
});
```

**Estimated complexity**: Medium

---

## File Structure

```
src/auth/
├── auth.module.ts                    # Updated
├── auth.resolver.ts                  # Updated
├── auth.service.ts                   # Unchanged
├── dto/
│   └── local-auth.types.ts           # New
├── guards/
│   └── jwt-auth.guard.ts             # Updated
├── interfaces/
│   └── auth-service.interface.ts     # New
├── providers/
│   └── auth-service.provider.ts      # New
├── services/
│   └── local-auth.service.ts         # New
├── utils/
│   └── mock-jwt.util.ts              # New
└── __tests__/
    ├── local-auth.service.spec.ts    # New
    └── mock-jwt.util.spec.ts         # New
```

---

## Dependencies

No new dependencies required. Uses existing:

- `@nestjs/common`
- `@nestjs/config`

---

## Implementation Order

1. Create interface (`auth-service.interface.ts`)
2. Create mock JWT utility (`mock-jwt.util.ts`)
3. Create local auth service (`local-auth.service.ts`)
4. Create provider factory (`auth-service.provider.ts`)
5. Update auth module (`auth.module.ts`)
6. Update auth resolver (`auth.resolver.ts`)
7. Update JWT guard (`jwt-auth.guard.ts`)
8. Add environment configuration
9. Write unit tests
10. Write integration tests

---

## Verification

After implementation, verify:

```bash
# Run linting
bun lint

# Run type checking
bun build

# Run tests
bun test

# Start local server
bun start:local

# Test via GraphQL playground:
# 1. mutation { signIn(input: { identifier: "+15551234567" }) { ... } }
# 2. mutation { confirmSignIn(input: { identifier: "...", session: "...", otpCode: "000000" }) { ... } }
# 3. Use returned accessToken in Authorization header
```

---

## Rollback Plan

If issues arise:

1. Remove `LocalAuthService` and `authServiceProvider`
2. Revert `AuthResolver` to direct `AuthService` injection
3. Revert `JwtAuthGuard` changes
4. Remove `AUTH_SERVICE` token from module exports

All changes are additive and isolated, making rollback straightforward.
