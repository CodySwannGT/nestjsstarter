# Task: Create PubSub Factory Provider

**Type:** Task
**Parent:** None

## Description

Create a factory provider that selects between `LocalPubSub` and `ValkeyPubSub` based on the `IS_OFFLINE` environment variable. This follows the established facade pattern from the auth module (`auth-service.provider.ts`).

## Acceptance Criteria

- [ ] `src/subscription/providers/pubsub.provider.ts` created
- [ ] Factory provider returns `LocalPubSub` when `IS_OFFLINE=true`
- [ ] Factory provider returns `ValkeyPubSub` when `IS_OFFLINE` is not "true"
- [ ] Provider uses `ConfigService` to read environment variable
- [ ] Unit tests cover both offline and online scenarios
- [ ] File includes proper JSDoc preamble
- [ ] Lint and type checks pass

## Relevant Research

**Auth Service Provider Pattern** (research.md - src/auth/providers/auth-service.provider.ts:23-34):
```typescript
export const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (
    configService: ConfigService,
    authService: AuthService,
    localAuthService: LocalAuthService
  ): IAuthService => {
    const isOffline = configService.get<string>("IS_OFFLINE") === "true";
    return isOffline ? localAuthService : authService;
  },
  inject: [ConfigService, AuthService, LocalAuthService],
};
```

**Current Subscription Module** (research.md - src/subscription/subscription.module.ts:12-37):
```typescript
export const PUB_SUB = "PUB_SUB";
// Current implementation uses direct ValkeyPubSub
```

**Provider Test Pattern** (research.md - src/auth/providers/auth-service.provider.test.ts:35-89):
```typescript
describe("useFactory", () => {
  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  it('should return LocalAuthService when IS_OFFLINE="true"', () => {
    (mockConfigService.get as jest.Mock).mockReturnValue("true");
    const result = authServiceProvider.useFactory(...);
    expect(result).toBe(mockLocalAuthService);
  });
});
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code (TDD, immutability)
- `/jsdoc-best-practices` - Required for file and function documentation
- `/nestjs-rules` - Required for NestJS provider patterns

## Implementation Details

**File to create**: `src/subscription/providers/pubsub.provider.ts`

**Implementation approach**:
1. Import `ConfigService` from `@nestjs/config`
2. Import `ValkeyPubSub` from `../pubsub/valkey-pubsub`
3. Import `LocalPubSub` from `../pubsub/local-pubsub`
4. Import `PUB_SUB` token (will be defined in subscription module)
5. Export `pubSubProvider` object with:
   - `provide: PUB_SUB`
   - `useFactory` function checking IS_OFFLINE
   - `inject` array with all dependencies

**Return type**: Since ValkeyPubSub and LocalPubSub have different class hierarchies, the return type should be `ValkeyPubSub | LocalPubSub`. Both implement the same method signatures.

## Testing Requirements

### Unit Tests
Create `src/subscription/providers/pubsub.provider.test.ts`:

- [ ] `describe('pubSubProvider')/it('should have PUB_SUB as provide token')`: Verify provider configuration
- [ ] `describe('pubSubProvider')/it('should inject ConfigService, ValkeyPubSub, and LocalPubSub')`: Verify inject array
- [ ] `describe('useFactory')/it('should return LocalPubSub when IS_OFFLINE="true"')`: Test offline mode
- [ ] `describe('useFactory')/it('should return ValkeyPubSub when IS_OFFLINE="false"')`: Test online mode
- [ ] `describe('useFactory')/it('should return ValkeyPubSub when IS_OFFLINE is undefined')`: Test default behavior

### Integration Tests
N/A - no external dependencies

### E2E Tests
N/A - will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file pubsub.provider.ts`, `@description Factory provider for PubSub service selection`, `@module subscription`
- [ ] `pubSubProvider` with `@description` explaining the environment-based selection

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL type changes

## Verification

### Type
`test-coverage`

### Proof Command
```bash
bun run test -- --testPathPattern=pubsub.provider.test.ts --coverage --collectCoverageFrom='src/subscription/providers/pubsub.provider.ts'
```

### Expected Output
- All tests pass
- Coverage shows 100% for pubsub.provider.ts

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

1. Create `src/subscription/providers/pubsub.provider.test.ts`
2. Write all unit tests based on Testing Requirements
3. Run tests to confirm they fail (TDD)

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

Create `src/subscription/providers/pubsub.provider.ts` implementing the factory provider until tests pass.

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
