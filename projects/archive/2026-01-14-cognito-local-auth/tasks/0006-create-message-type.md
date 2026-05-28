# Task: Create Message Type

**Type:** Task
**Parent:** None

## Description

Create the `Message` GraphQL object type used for simple response messages. This type is used for operations that return a success/error message, such as sign-out responses.

## Acceptance Criteria

- [ ] `Message` type created at `src/auth/types/message.type.ts`
- [ ] Type has proper `@ObjectType` and `@Field` decorators with descriptions
- [ ] `message` field is non-nullable
- [ ] JSDoc documentation follows codebase conventions
- [ ] Unit tests verify decorator metadata
- [ ] Index file created at `src/auth/types/index.ts` to export all types

## Relevant Research

From reference implementation at `src/common/types/message.type.ts`:

**Message**:
- `message: string` - The message content (non-nullable)

This is a simple wrapper type for string messages used across the API.

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-graphql` - For GraphQL object type patterns
- `/nestjs-rules` - For NestJS patterns

## Implementation Details

### File: `src/auth/types/message.type.ts`
```typescript
import { ObjectType, Field } from "@nestjs/graphql";

/**
 * Simple message response type
 * @description Used for mutations and operations that return a success/error message
 */
@ObjectType({ description: "Simple message response type" })
export class Message {
  /** The message content */
  @Field(() => String, { description: "The message content" })
  message: string;
}
```

### File: `src/auth/types/index.ts`
```typescript
export { AuthenticationResult } from "./authentication-result.type";
export { AuthenticationResultWithMessage } from "./authentication-result-with-message.type";
export { ChallengeParametersResult } from "./challenge-parameters-result.type";
export { ChallengeResult } from "./challenge-result.type";
export { ConfirmSignInResult } from "./confirm-sign-in-result.type";
export { Message } from "./message.type";
export { SignInResult } from "./sign-in-result.type";
```

## Testing Requirements

### Unit Tests

Create test file `src/auth/types/message.type.test.ts`:
- [ ] `describe('Message')/it('should have ObjectType decorator')`: Verify decorator
- [ ] `describe('Message')/it('should have message field as non-nullable string')`: Verify field is required
- [ ] `describe('Message')/it('should have proper description')`: Verify description in decorator

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] `Message` class - @description
- [ ] `message` field - JSDoc comment

### Database Comments
N/A - no database changes

### GraphQL Descriptions
- [ ] `@ObjectType` decorator has description
- [ ] `@Field` decorator has description

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern="src/auth/types/message.*\\.test\\.ts" --coverage --collectCoverageFrom='src/auth/types/message.type.ts' --coverageThreshold='{"global":{"lines":80}}'
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
2. Write tests that check decorator metadata
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create Message type file
2. Create index.ts to export all types
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
