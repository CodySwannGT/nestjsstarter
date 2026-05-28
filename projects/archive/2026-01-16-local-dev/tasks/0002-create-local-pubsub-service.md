# Task: Create LocalPubSub Service

**Type:** Task
**Parent:** None

## Description

Create a `LocalPubSub` service that provides in-memory publish/subscribe functionality for local development. This service must implement the same interface as `ValkeyPubSub` (publishCreated, publishUpdated, publishDeleted, asyncIterator) but use the `graphql-subscriptions` library's PubSub class for actual subscription delivery.

In production, ValkeyPubSub publishes messages via API Gateway WebSockets. In local development, LocalPubSub uses graphql-subscriptions' built-in asyncIterator to deliver messages directly through NestJS's graphql-ws integration.

## Acceptance Criteria

- [ ] `src/subscription/pubsub/local-pubsub.ts` created
- [ ] Extends `PubSub` class from `graphql-subscriptions`
- [ ] Implements `publishCreated(resourceType, data, filters)` method
- [ ] Implements `publishUpdated(resourceType, data, filters)` method
- [ ] Implements `publishDeleted(resourceType, data, filters)` method
- [ ] Inherits working `asyncIterator()` from parent PubSub class
- [ ] Unit tests cover all publish methods
- [ ] File includes proper JSDoc preamble
- [ ] Lint and type checks pass

## Relevant Research

**ValkeyPubSub Interface** (research.md - src/subscription/pubsub/valkey-pubsub.ts:46-234):
```typescript
// Methods to implement with same signatures:
publishCreated<T>(resourceType: string, data: T, filters?: SubscriptionFilters): Promise<void>
publishUpdated<T>(resourceType: string, data: T, filters?: SubscriptionFilters): Promise<void>
publishDeleted<T>(resourceType: string, data: T, filters?: SubscriptionFilters): Promise<void>
asyncIterator(triggerName: string): AsyncIterator<unknown>
```

**SubscriptionFilters Interface** (research.md - src/valkey/valkey.interface.ts:54-61):
```typescript
export interface SubscriptionFilters {
  resourceId?: string;
  ownerId?: string;
  organizationId?: string;
}
```

**Trigger Name Convention** (from brief.md):
- Created: `On${resourceType}Created`
- Updated: `On${resourceType}Updated`
- Deleted: `On${resourceType}Deleted`

**Payload Convention** (from brief.md):
- Created: `{ [${resourceType.toLowerCase()}Created]: data }`
- Updated: `{ [${resourceType.toLowerCase()}Updated]: data }`
- Deleted: `{ [${resourceType.toLowerCase()}Deleted]: data }`

**graphql-subscriptions Package**:
- Already a dependency in package.json
- Standard PubSub provides working `publish()` and `asyncIterator()` methods

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD, immutability)
- `/jsdoc-best-practices` - Required for file and function documentation
- `/nestjs-rules` - Required for NestJS service patterns
- `/nestjs-graphql` - Required for GraphQL subscription patterns

## Implementation Details

**File to create**: `src/subscription/pubsub/local-pubsub.ts`

**Implementation approach**:
1. Import `PubSub` from `graphql-subscriptions`
2. Import `Injectable` from `@nestjs/common`
3. Import `SubscriptionFilters` from valkey interface
4. Create `LocalPubSub` class extending `PubSub` with `@Injectable()` decorator
5. Implement `publishCreated()` - calls parent `publish()` with trigger name and payload
6. Implement `publishUpdated()` - calls parent `publish()` with trigger name and payload
7. Implement `publishDeleted()` - calls parent `publish()` with trigger name and payload
8. `asyncIterator()` is inherited from parent class - no implementation needed

**Filters parameter**: The `_filters` parameter is unused in local mode (included for interface parity with ValkeyPubSub). Use underscore prefix to indicate intentionally unused.

## Testing Requirements

### Unit Tests
Create `src/subscription/pubsub/local-pubsub.test.ts`:

- [ ] `describe('LocalPubSub')/it('should be defined')`: Verify service instantiates
- [ ] `describe('publishCreated')/it('should publish with correct trigger name')`: Verify trigger `OnUserCreated` format
- [ ] `describe('publishCreated')/it('should publish with correct payload structure')`: Verify `{ userCreated: data }` format
- [ ] `describe('publishUpdated')/it('should publish with correct trigger name')`: Verify trigger `OnUserUpdated` format
- [ ] `describe('publishUpdated')/it('should publish with correct payload structure')`: Verify `{ userUpdated: data }` format
- [ ] `describe('publishDeleted')/it('should publish with correct trigger name')`: Verify trigger `OnUserDeleted` format
- [ ] `describe('publishDeleted')/it('should publish with correct payload structure')`: Verify `{ userDeleted: data }` format
- [ ] `describe('asyncIterator')/it('should return async iterator from parent class')`: Verify asyncIterator works

### Integration Tests
N/A - no external dependencies to test

### E2E Tests
N/A - will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file local-pubsub.ts`, `@description Local PubSub implementation using in-memory graphql-subscriptions`, `@module subscription`
- [ ] `LocalPubSub` class with `@description` explaining its purpose for local development
- [ ] `publishCreated` with `@param resourceType`, `@param data`, `@param _filters`, `@returns`
- [ ] `publishUpdated` with `@param resourceType`, `@param data`, `@param _filters`, `@returns`
- [ ] `publishDeleted` with `@param resourceType`, `@param data`, `@param _filters`, `@returns`

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL type changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern=local-pubsub.test.ts --coverage --collectCoverageFrom='src/subscription/pubsub/local-pubsub.ts'
```

### Expected Output
- All tests pass
- Coverage shows 100% for local-pubsub.ts (or high coverage for all methods)

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Write failing tests
- Write implementation
- Verify implementation
- Update documentation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke each skill listed in "Applicable Skills" using the Skill tool

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

1. Create `src/subscription/pubsub/local-pubsub.test.ts`
2. Write all unit tests based on Testing Requirements
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

Create `src/subscription/pubsub/local-pubsub.ts` implementing all methods until tests pass.

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
