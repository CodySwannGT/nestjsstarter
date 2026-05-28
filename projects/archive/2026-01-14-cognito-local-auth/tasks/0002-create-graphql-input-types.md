# Task: Create GraphQL Input Types

**Type:** Task
**Parent:** None

## Description

Create the GraphQL input types for authentication operations: `SignInInput`, `ConfirmSignInInput`, `RefreshTokenInput`, and `ResendOtpInput`. These input types define the structure of data clients send for authentication mutations.

## Acceptance Criteria

- [ ] `SignInInput` created at `src/auth/inputs/sign-in.input.ts`
- [ ] `ConfirmSignInInput` created at `src/auth/inputs/confirm-sign-in.input.ts`
- [ ] `RefreshTokenInput` created at `src/auth/inputs/refresh-token.input.ts`
- [ ] `ResendOtpInput` created at `src/auth/inputs/resend-otp.input.ts`
- [ ] Index file created at `src/auth/inputs/index.ts` for clean exports
- [ ] All types have proper `@InputType` and `@Field` decorators with descriptions
- [ ] All types have JSDoc documentation
- [ ] Unit tests for each input type validate decorators are applied

## Relevant Research

From reference implementation at `src/auth/inputs/`:

**SignInInput**:
- `identifier: string` - Email or phone number

**ConfirmSignInInput**:
- `otpCode: string` - OTP code sent to user
- `identifier: string` - Email or phone number
- `session: string` - Session token from sign-in

**RefreshTokenInput**:
- `refreshToken: string` - Refresh token from previous auth

**ResendOtpInput**:
- `identifier: string` - Email or phone number

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-graphql` - For GraphQL input type patterns
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/inputs/sign-in.input.ts`
```typescript
import { InputType, Field } from "@nestjs/graphql";

@InputType({ description: "Input for initiating sign-in process" })
export class SignInInput {
  @Field(() => String, { description: "The identifier used to sign in (email or phone number)" })
  identifier: string;
}
```

### File: `src/auth/inputs/confirm-sign-in.input.ts`
```typescript
import { InputType, Field } from "@nestjs/graphql";

@InputType({ description: "Input for confirming sign-in with OTP" })
export class ConfirmSignInInput {
  @Field(() => String, { description: "The OTP code sent to the user" })
  otpCode: string;

  @Field(() => String, { description: "The identifier used during sign-in (email or phone number)" })
  identifier: string;

  @Field(() => String, { description: "The session token from the sign-in request" })
  session: string;
}
```

### File: `src/auth/inputs/refresh-token.input.ts`
```typescript
import { InputType, Field } from "@nestjs/graphql";

@InputType({ description: "Input for refreshing authentication token" })
export class RefreshTokenInput {
  @Field(() => String, { description: "The refresh token from a previous authentication" })
  refreshToken: string;
}
```

### File: `src/auth/inputs/resend-otp.input.ts`
```typescript
import { InputType, Field } from "@nestjs/graphql";

@InputType({ description: "Input for resending OTP code" })
export class ResendOtpInput {
  @Field(() => String, { description: "The identifier to send the OTP to (email or phone number)" })
  identifier: string;
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/inputs/sign-in.input.test.ts`:
- [ ] `describe('SignInInput')/it('should have InputType decorator applied')`: Verify decorator metadata
- [ ] `describe('SignInInput')/it('should have identifier field with Field decorator')`: Verify field metadata

Create test file `src/auth/inputs/confirm-sign-in.input.test.ts`:
- [ ] `describe('ConfirmSignInInput')/it('should have InputType decorator applied')`: Verify decorator metadata
- [ ] `describe('ConfirmSignInInput')/it('should have all required fields')`: Verify otpCode, identifier, session fields

Create test file `src/auth/inputs/refresh-token.input.test.ts`:
- [ ] `describe('RefreshTokenInput')/it('should have InputType decorator applied')`: Verify decorator metadata

Create test file `src/auth/inputs/resend-otp.input.test.ts`:
- [ ] `describe('ResendOtpInput')/it('should have InputType decorator applied')`: Verify decorator metadata

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
- [ ] `SignInInput` - description in @InputType decorator
- [ ] `ConfirmSignInInput` - description in @InputType decorator
- [ ] `RefreshTokenInput` - description in @InputType decorator
- [ ] `ResendOtpInput` - description in @InputType decorator
- [ ] All fields - description in @Field decorator

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/inputs/.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/inputs/*.ts' --coverageThreshold='{"global":{"lines":80}}'
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

1. Create test files for each input type
2. Write tests that check decorator metadata
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/auth/inputs/` directory
2. Create each input type file
3. Create index.ts for exports
4. Run tests until they pass

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
