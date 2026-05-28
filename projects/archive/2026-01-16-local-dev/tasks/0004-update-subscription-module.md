# Task: Update Subscription Module with Facade Pattern

**Type:** Task
**Parent:** None

## Description

Refactor the Subscription module to use the factory provider pattern for PubSub selection. The module should import both `ValkeyPubSub` and `LocalPubSub` as providers, then use the `pubSubProvider` factory to select the appropriate implementation based on environment.

## Acceptance Criteria

- [ ] `src/subscription/subscription.module.ts` updated with facade pattern
- [ ] Module imports `ConfigModule`
- [ ] Module provides `ValkeyPubSub`, `LocalPubSub`, and `pubSubProvider`
- [ ] Module exports `PUB_SUB` token
- [ ] Existing functionality for Lambda deployment unchanged
- [ ] Lint and type checks pass
- [ ] All existing tests pass

## Relevant Research

**Current Subscription Module** (research.md - src/subscription/subscription.module.ts:12-37):
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

**Auth Module Pattern** (research.md - src/auth/auth.module.ts:28-47):
```typescript
@Module({
  imports: [ConfigModule],
  providers: [
    AuthService,
    LocalAuthService,
    authServiceProvider,
  ],
  exports: [AUTH_SERVICE],
})
```

**Target Structure** (from brief.md):
```typescript
@Global()
@Module({
  imports: [ConfigModule],
  providers: [ValkeyPubSub, LocalPubSub, pubSubProvider],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - Required for NestJS module patterns

## Implementation Details

**File to modify**: `src/subscription/subscription.module.ts`

**Changes required**:
1. Add import for `ConfigModule` from `@nestjs/config`
2. Add import for `LocalPubSub` from `./pubsub/local-pubsub`
3. Add import for `pubSubProvider` from `./providers/pubsub.provider`
4. Update `imports` array to include `ConfigModule` and `ValkeyModule`
5. Update `providers` array to include:
   - `ValkeyPubSub` (as direct class provider)
   - `LocalPubSub` (as direct class provider)
   - `pubSubProvider` (factory provider)
6. Keep `exports: [PUB_SUB]` unchanged

**Important**: ValkeyPubSub needs ValkeyService injected. The existing ValkeyModule import should remain to provide ValkeyService. ValkeyPubSub should be converted from inline factory to class provider.

**Note**: The `PUB_SUB` token may need to be moved to a separate file or kept in the module. Follow the pattern from auth module where `AUTH_SERVICE` is in the provider file.

## Testing Requirements

### Unit Tests
N/A - Module configuration is verified through integration/compilation

### Integration Tests
N/A - Will be verified in Task 8

### E2E Tests
N/A - Will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] Update file preamble if needed to reflect facade pattern changes

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL type changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run lint && bun run build && bun run test
```

### Expected Output
- No lint errors
- TypeScript compilation succeeds
- All existing tests pass (ensures no regression)

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

N/A - Module changes verified through compilation and existing tests.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read current `src/subscription/subscription.module.ts`
2. Update imports
3. Update module configuration
4. Ensure ValkeyPubSub still works with its ValkeyService dependency

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
