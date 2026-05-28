# Task: Create GraphQL ConfirmSignInResult Type

**Type:** Task
**Parent:** None

## Description

Create the `ConfirmSignInResult` GraphQL object type that represents the result of confirming a sign-in with OTP. This type can contain either an error message, authentication result, or an additional challenge requirement.

## Acceptance Criteria

- [ ] `ConfirmSignInResult` created at `src/auth/types/confirm-sign-in-result.type.ts`
- [ ] Type has proper `@ObjectType` and `@Field` decorators with descriptions
- [ ] All fields are nullable (either error, auth result, or additional challenge)
- [ ] References `Message`, `AuthenticationResultWithMessage`, and `SignInResult` types
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify decorator metadata

## Relevant Research

From reference implementation at `src/auth/types/confirm-sign-in-result.type.ts`:

**ConfirmSignInResult**:
- `errorMessage?: Message` - Error message if sign-in confirmation failed
- `authResult?: AuthenticationResultWithMessage` - Authentication result if sign-in was successful
- `signInResult?: SignInResult` - Additional challenge required for sign-in

Note: The reference implementation has `validationCodes` for profile validation, but we'll omit this for the initial implementation as it's specific to that project's user profile requirements.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-graphql` - For GraphQL object type patterns
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/types/confirm-sign-in-result.type.ts`
```typescript
import { ObjectType, Field } from "@nestjs/graphql";
import { AuthenticationResultWithMessage } from "./authentication-result-with-message.type";
import { Message } from "./message.type";
import { SignInResult } from "./sign-in-result.type";

/**
 * Result of confirm sign-in operation
 * @description Contains either error message, authentication result, or additional challenge requirement
 */
@ObjectType({ description: "Result of confirm sign-in operation" })
export class ConfirmSignInResult {
  /** Error message if sign-in confirmation failed */
  @Field(() => Message, { nullable: true, description: "Error message if sign-in confirmation failed" })
  errorMessage?: Message;

  /** Authentication result if sign-in was successful */
  @Field(() => AuthenticationResultWithMessage, { nullable: true, description: "Authentication result if sign-in was successful" })
  authResult?: AuthenticationResultWithMessage;

  /** Additional challenge required for sign-in */
  @Field(() => SignInResult, { nullable: true, description: "Additional challenge required for sign-in" })
  signInResult?: SignInResult;
}
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/types/confirm-sign-in-result.type.test.ts`:
- [ ] `describe('ConfirmSignInResult')/it('should have ObjectType decorator')`: Verify decorator
- [ ] `describe('ConfirmSignInResult')/it('should have errorMessage field with Message type')`: Verify field type
- [ ] `describe('ConfirmSignInResult')/it('should have authResult field with AuthenticationResultWithMessage type')`: Verify field type
- [ ] `describe('ConfirmSignInResult')/it('should have signInResult field with SignInResult type')`: Verify field type
- [ ] `describe('ConfirmSignInResult')/it('should have all fields as nullable')`: Verify nullable metadata

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `ConfirmSignInResult` class - @description
- [ ] Each field - JSDoc comment

### Database Comments
N/A - no database changes

### GraphQL Descriptions
- [ ] `@ObjectType` decorator has description
- [ ] All `@Field` decorators have descriptions

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/types/confirm-sign-in-result.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/types/confirm-sign-in-result.type.ts' --coverageThreshold='{"global":{"lines":80}}'
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

1. Create test file
2. Write tests that check decorator metadata and field types
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Ensure dependent types exist (Message, AuthenticationResultWithMessage, SignInResult)
2. Create ConfirmSignInResult type
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
