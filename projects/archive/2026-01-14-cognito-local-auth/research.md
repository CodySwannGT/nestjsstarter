---
date: 2026-01-14T16:09:41-0500
status: complete
last_updated: 2026-01-14
---

# Research

## Summary

This research investigates the implementation requirements for a local authentication facade that bypasses AWS Cognito during local development. The codebase currently has an **authorization system** (decorators for access control) but **no authentication system** (sign-in, OTP, token generation). The implementation will add new authentication capabilities without modifying the existing authorization infrastructure.

Key findings:
- No existing auth service, resolver, or guard for authentication flows
- JWT validation pattern exists in websocket authorizer with `IS_OFFLINE` support
- Provider factory pattern exists in subscription module for injection token selection
- No NestJS ConfigService - uses `process.env` directly
- Clear testing patterns with Jest (`.test.ts` for unit, `.integration.test.ts` for integration)
- Comprehensive JSDoc conventions throughout codebase

## Detailed Findings

### Current Auth Module Structure

The existing `src/auth/` module provides **authorization decorators** (who can access what), not authentication (verifying identity).

**Files in `src/auth/`:**
- `auth.module.ts` - Empty module shell
- `auth.types.ts` - Authorization type definitions (AuthLevel, Permission, AuthRule, AuthUser)
- `auth.transformer.ts` - GraphQL schema transformer for zero-trust authorization
- `index.ts` - Public API exports
- `decorators/` - Authorization decorators (Public, Authed, Owner, Groups, FieldAuth)

**What exists:**
- `AuthUser` interface (`src/auth/auth.types.ts:58-63`) defines the shape of authenticated users
- Schema transformation (`src/auth/auth.transformer.ts:166-236`) enforces authorization rules
- Authorization decorators for Query/Mutation access control

**What does NOT exist:**
- Auth service (no sign-in, confirm, token refresh methods)
- Auth resolver (no GraphQL mutations for authentication)
- JWT validation guard (no NestJS guard for HTTP requests)
- Cognito integration for HTTP GraphQL requests

### JWT Validation Pattern

The websocket authorizer (`src/websocket/authorizer/ws-authorizer.handler.ts`) demonstrates the JWT validation pattern:

```typescript
// src/websocket/authorizer/ws-authorizer.handler.ts:84-101
const validateJwt = async (token: string): Promise<JwtPayload> => {
  if (process.env.IS_OFFLINE === "true") {
    // Local dev: decode without verification
    const payload = decodeJwtUnsafe(token);
    // Still check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }
    return payload;
  }
  // Production: Full cryptographic verification with aws-jwt-verify
  const verifier = getCognitoVerifier();
  return await verifier.verify(token);
};
```

Key aspects:
- Uses `CognitoJwtVerifier` from `aws-jwt-verify` for production
- Uses `decodeJwtUnsafe()` helper for local development (no signature verification)
- Checks token expiration even in local mode
- Extracts `sub`, `cognito:groups`, `email` from token payload

### Environment Detection Pattern

The database module (`src/database/database.config.ts:74-80`) shows the standard environment detection:

```typescript
export function isLocalEnvironment(): boolean {
  const isOffline = process.env.IS_OFFLINE === "true";
  const isTest = process.env.NODE_ENV === "test";
  return isOffline || isTest;
}
```

Note: The project uses `process.env` directly, not NestJS `ConfigService`.

### Provider Factory Pattern

The subscription module (`src/subscription/subscription.module.ts:23-37`) demonstrates the factory provider pattern:

```typescript
export const PUB_SUB = "PUB_SUB";

@Global()
@Module({
  imports: [ValkeyModule],
  providers: [
    {
      provide: PUB_SUB,
      useFactory: (valkeyService: ValkeyService) => {
        return new ValkeyPubSub(valkeyService);
      },
      inject: [ValkeyService],
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
```

This pattern is directly applicable for creating an `AUTH_SERVICE` provider that selects between `AuthService` and `LocalAuthService` based on environment.

### Resolver Pattern

The hello resolver (`src/hello/hello.resolver.ts`) shows the standard resolver structure:

```typescript
@Resolver()
export class HelloResolver {
  constructor(private readonly helloService: HelloService) {}

  @Query(() => String, { description: "Public health check" })
  @Public()
  hello(): string { ... }

  @Mutation(() => String, { description: "Requires authentication" })
  @Authed()
  greet(@Args("name") name: string): string { ... }
}
```

Key patterns:
- Constructor injection of services
- `@Query` and `@Mutation` decorators with return types and descriptions
- Auth decorators (`@Public()`, `@Authed()`) applied to each operation

### Module Structure Pattern

Standard NestJS module structure (`src/hello/hello.module.ts`):

```typescript
@Module({
  providers: [HelloService, HelloResolver, HelloSubscriptionResolver],
  exports: [HelloService],
})
export class HelloModule {}
```

### GraphQL Context Structure

The app module (`src/app.module.ts:42-46`) shows how context is provided:

```typescript
context: ({ req, res }: { req: Request; res: Response }) => ({
  req,
  res,
  loaders: dataLoaderService.getLoaders(),
}),
```

User information is expected at `context.req.user` (set by middleware/guard).

### Lambda Entry Point

The main entry point (`src/main.ts`) uses serverless-express for Lambda compatibility. No authentication middleware is currently applied.

## Code References

- `src/auth/auth.module.ts` - Empty auth module to extend
- `src/auth/auth.types.ts:58-63` - AuthUser interface definition
- `src/auth/auth.transformer.ts:166-236` - Schema auth enforcement
- `src/websocket/authorizer/ws-authorizer.handler.ts:84-101` - JWT validation with IS_OFFLINE support
- `src/websocket/authorizer/ws-authorizer.handler.ts:62-74` - `decodeJwtUnsafe()` helper function
- `src/websocket/authorizer/ws-authorizer.handler.ts:35-54` - Cognito verifier singleton
- `src/database/database.config.ts:74-80` - `isLocalEnvironment()` pattern
- `src/subscription/subscription.module.ts:23-37` - Provider factory pattern
- `src/hello/hello.resolver.ts` - Resolver with auth decorators
- `src/hello/hello.service.ts` - Service pattern
- `src/app.module.ts:28-48` - GraphQL module configuration with context

## Architecture Documentation

### Framework: NestJS with GraphQL

The codebase uses:
- **NestJS 11** - Dependency injection, modules, decorators
- **Apollo Server 5** - GraphQL server with code-first schema
- **TypeORM** - Database ORM with PostgreSQL
- **Serverless Framework** - Lambda deployment with `serverless-offline`
- **aws-jwt-verify** - Cognito JWT validation

### Authorization Flow

1. GraphQL operations require auth decorators (`@Public()`, `@Authed()`, etc.)
2. `combinedAuthTransformer()` transforms schema to enforce rules
3. User context expected at `context.req.user` (type `AuthUser`)
4. Missing auth extensions throw at schema build time ("MISSING_AUTH" error)

### Missing Authentication Flow

The brief requires implementing:
1. `signIn` mutation - Initiate auth, return session
2. `confirmSignIn` mutation - Verify OTP, return tokens
3. `refreshToken` mutation - Refresh access tokens
4. `signOut` mutation - End session
5. JWT validation middleware/guard for HTTP requests

## Testing Patterns

### Unit Test Patterns
- **Location**: `src/**/*.test.ts` (co-located with source files)
- **Framework**: Jest with ts-jest
- **Example to follow**: `src/hello/hello.resolver.test.ts`
- **Conventions**:
  - File naming: `{name}.test.ts`
  - Test context interface pattern (e.g., `interface TestContext { resolver: HelloResolver }`)
  - Use `Test.createTestingModule()` for NestJS testing
  - Mock external dependencies with `jest.mock()`
  - Constants at top of file (e.g., `const TEST_USER_ID = "user-123"`)

### Integration Test Patterns
- **Location**: `src/**/*.integration.test.ts`
- **Example to follow**: `src/subscription/subscription.integration.test.ts`
- **Conventions**:
  - Check external service availability before running
  - Cleanup test data after tests
  - Use `beforeAll` for module setup, `afterAll` for teardown
  - Skip tests gracefully when dependencies unavailable

### Mock Patterns
From `src/valkey/valkey.service.test.ts`:

```typescript
const createMockRedis = (): jest.Mocked<Redis> => {
  const mock = {
    setex: jest.fn().mockResolvedValue("OK"),
    // ...other methods
  } as unknown as jest.Mocked<Redis>;
  return mock;
};
```

## Documentation Patterns

### JSDoc Conventions
- **Style**: TypeScript-flavor JSDoc with `@file`, `@description`, `@module` for files
- **Example**: `src/auth/auth.transformer.ts:1-5`

```typescript
/**
 * @file auth.transformer.ts
 * @description GraphQL schema transformer for zero-trust authorization
 * @module auth
 */
```

- **Required tags**:
  - `@file` - File name
  - `@description` - Brief description of file purpose
  - `@module` - Module name for organization
  - `@param` - Parameter descriptions for functions
  - `@returns` - Return value descriptions
  - `@remarks` - Additional implementation notes when needed

### Function Documentation

```typescript
/**
 * Validates a JWT token with full cryptographic verification
 * @param token - The JWT token to validate
 * @returns The decoded and validated payload
 * @remarks
 * - Uses aws-jwt-verify for production Cognito token validation
 * - Falls back to decode-only mode in development (IS_OFFLINE=true)
 */
```

### Database Comments (Backend Only)
- **Convention**: Not heavily used in current codebase
- **Example**: Entity classes use TypeORM decorators, minimal column comments
- **Required for**: New tables should include `@Column({ comment: '...' })` for complex fields

### GraphQL Descriptions (Backend Only)
- **Convention**: Use `description` option in decorators
- **Example**: `src/hello/hello.resolver.ts:34`

```typescript
@Query(() => String, { description: "Public health check" })
```

- **Required for**: All Query/Mutation operations, complex type fields

## Open Questions

### Q1: Where should user data be persisted?
**Question**: Should local auth store users in the database, or is in-memory storage sufficient for local development?
**Context**: The brief mentions generating "deterministic user IDs from identifier" but doesn't specify if users should be created in the database during local auth flow. The reference documentation shows database user creation in production auth.
**Impact**: Affects whether LocalAuthService needs UserRepository injection and database writes.
**Answer**: In-memory storage is sufficient for local development.

### Q2: Should existing GraphQL schema structure be preserved exactly?
**Question**: The brief states "No changes to GraphQL schema or client contract" - does the project have existing auth-related types/mutations that must be matched, or is this a new schema addition?
**Context**: No existing auth resolver or GraphQL mutations were found in the codebase. The reference `cognito-plus-local-auth.md` shows specific types (`SignInResult`, `ConfirmSignInResult`) but it's unclear if these must be used verbatim.
**Impact**: Determines whether we can design new DTOs/types or must match an existing API contract from another project.
**Answer**: Follow the schema structure from the reference implementation at `src/auth/`. See "Reference Implementation" section below for details.

### Q3: Is NestJS ConfigService required or should we continue using process.env?
**Question**: The brief references `ConfigService` for environment detection, but the codebase uses `process.env` directly. Which pattern should be followed?
**Context**: Brief task 4 shows `configService.get<string>("IS_OFFLINE")`, but existing code (database.config.ts, ws-authorizer.handler.ts) uses `process.env.IS_OFFLINE` directly.
**Impact**: Affects provider factory implementation and whether ConfigModule needs to be added to imports.
**Answer**: Use NestJS ConfigService for environment detection.

## Reference Implementation

The GraphQL schema contract should follow the structure from `src/auth/`.

### Resolver Methods (auth.resolver.ts)

| Method | Return Type | Description |
|--------|-------------|-------------|
| `signIn(input: SignInInput)` | `SignInResult` | Initiates sign-in, returns challenge |
| `confirmSignIn(input: ConfirmSignInInput, context)` | `ConfirmSignInResult` | Verifies OTP, returns tokens |
| `resendOTP(input: ResendOtpInput)` | `SignInResult` | Resends OTP code |
| `refreshToken(input: RefreshTokenInput)` | `AuthenticationResultWithMessage` | Refreshes access tokens |
| `signOut(accessToken, context)` | `Message` | Signs out user |

### GraphQL Types

**SignInResult**:
```typescript
@ObjectType()
class SignInResult {
  message: string;           // Status message
  data: ChallengeResult;     // Challenge data requiring user response
}
```

**ChallengeResult**:
```typescript
@ObjectType()
class ChallengeResult {
  ChallengeName?: string;              // Name of challenge type
  Session?: string;                    // Session token for challenge
  ChallengeParameters?: ChallengeParametersResult;
}
```

**ConfirmSignInResult**:
```typescript
@ObjectType()
class ConfirmSignInResult {
  errorMessage?: Message;                      // Error if confirmation failed
  authResult?: AuthenticationResultWithMessage; // Auth result if successful
  signInResult?: SignInResult;                 // Additional challenge if needed
}
```

**AuthenticationResultWithMessage**:
```typescript
@ObjectType()
class AuthenticationResultWithMessage {
  data?: AuthenticationResult;  // The auth result data
  message?: string;             // Status message
}
```

**AuthenticationResult**:
```typescript
@ObjectType()
class AuthenticationResult {
  accessToken?: string;   // JWT access token
  expiresIn?: number;     // Expiration in seconds
  tokenType?: string;     // Typically 'Bearer'
  refreshToken?: string;  // Refresh token
  idToken?: string;       // JWT ID token with user claims
}
```

### GraphQL Inputs

**SignInInput**:
```typescript
@InputType()
class SignInInput {
  identifier: string;  // Email or phone number
}
```

**ConfirmSignInInput**:
```typescript
@InputType()
class ConfirmSignInInput {
  otpCode: string;     // OTP code sent to user
  identifier: string;  // Email or phone number
  session: string;     // Session token from sign-in
}
```

**RefreshTokenInput**:
```typescript
@InputType()
class RefreshTokenInput {
  refreshToken: string;  // Refresh token from previous auth
}
```

### File Structure in Reference

```
src/auth/
├── auth.module.ts
├── auth.resolver.ts
├── auth.service.ts
├── inputs/
│   ├── sign-in.input.ts
│   ├── confirm-sign-in.input.ts
│   ├── refresh-token.input.ts
│   └── resend-otp.input.ts
├── types/
│   ├── sign-in-result.type.ts
│   ├── confirm-sign-in-result.type.ts
│   ├── authentication-result.type.ts
│   ├── authentication-result-with-message.type.ts
│   └── challenge-result.type.ts
└── decorators/
    └── (auth decorators)
```
