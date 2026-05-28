# Task: Create GraphQL Authentication Result Types

**Type:** Task
**Parent:** None

## Description

Create the GraphQL object types for authentication results: `AuthenticationResult` and `AuthenticationResultWithMessage`. These types represent successful authentication responses containing tokens.

## Acceptance Criteria

- [ ] `AuthenticationResult` created at `src/auth/types/authentication-result.type.ts`
- [ ] `AuthenticationResultWithMessage` created at `src/auth/types/authentication-result-with-message.type.ts`
- [ ] All types have proper `@ObjectType` and `@Field` decorators with descriptions
- [ ] All nullable fields properly marked
- [ ] `expiresIn` uses `@Field(() => Int)` for proper GraphQL integer type
- [ ] All types have JSDoc documentation
- [ ] Unit tests verify decorator metadata

## Relevant Research

From reference implementation at `src/auth/types/`:

**AuthenticationResult**:
- `accessToken?: string` - JWT access token for API requests
- `expiresIn?: number` - Token expiration time in seconds (Int type)
- `tokenType?: string` - Type of token (typically 'Bearer')
- `refreshToken?: string` - Refresh token for obtaining new access tokens
- `idToken?: string` - JWT ID token containing user claims

Note: The reference has `newDeviceMetadata` but we'll omit it for simplicity in local auth.

**AuthenticationResultWithMessage**:
- `data?: AuthenticationResult` - The authentication result data
- `message?: string` - User-friendly status message

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-graphql` - For GraphQL object type patterns
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/types/authentication-result.type.ts`
```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";

/**
 * Result of successful authentication
 * @description Contains access tokens and session information
 */
@ObjectType({ description: "Result of successful authentication" })
export class AuthenticationResult {
  /** JWT access token for API requests */
  @Field(() => String, { nullable: true, description: "JWT access token for API requests" })
  accessToken?: string;

  /** Token expiration time in seconds */
  @Field(() => Int, { nullable: true, description: "Token expiration time in seconds" })
  expiresIn?: number;

  /** Type of token (typically 'Bearer') */
  @Field(() => String, { nullable: true, description: "Type of token (typically 'Bearer')" })
  tokenType?: string;

  /** Refresh token for obtaining new access tokens */
  @Field(() => String, { nullable: true, description: "Refresh token for obtaining new access tokens" })
  refreshToken?: string;

  /** JWT ID token containing user claims */
  @Field(() => String, { nullable: true, description: "JWT ID token containing user claims" })
  idToken?: string;
}
```

### File: `src/auth/types/authentication-result-with-message.type.ts`
```typescript
import { ObjectType, Field } from "@nestjs/graphql";
import { AuthenticationResult } from "./authentication-result.type";

/**
 * Authentication result with status message
 * @description Wraps authentication result with a user-friendly message
 */
@ObjectType({ description: "Authentication result with status message" })
export class AuthenticationResultWithMessage {
  /** The authentication result data */
  @Field(() => AuthenticationResult, { nullable: true, description: "The authentication result data" })
  data?: AuthenticationResult;

  /** User-friendly status message */
  @Field(() => String, { nullable: true, description: "User-friendly status message" })
  message?: string;
}
```

## Testing Requirements

### Unit Tests

Create test files for each type:
- [ ] `describe('AuthenticationResult')/it('should have ObjectType decorator')`: Verify decorator
- [ ] `describe('AuthenticationResult')/it('should have expiresIn as Int type')`: Verify Int field type
- [ ] `describe('AuthenticationResult')/it('should have all token fields nullable')`: Verify field metadata
- [ ] `describe('AuthenticationResultWithMessage')/it('should have ObjectType decorator')`: Verify decorator
- [ ] `describe('AuthenticationResultWithMessage')/it('should have nested AuthenticationResult field')`: Verify nested type

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Each class - @description
- [ ] Each field - JSDoc comment

### Database Comments
N/A - no database changes

### GraphQL Descriptions
- [ ] All `@ObjectType` decorators have descriptions
- [ ] All `@Field` decorators have descriptions

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/types/authentication.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/types/authentication*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

### Expected Output
All tests pass. Coverage meets threshold.

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

1. Create test files for each type
2. Write tests that check decorator metadata
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `AuthenticationResult` first (dependency)
2. Create `AuthenticationResultWithMessage` second
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
