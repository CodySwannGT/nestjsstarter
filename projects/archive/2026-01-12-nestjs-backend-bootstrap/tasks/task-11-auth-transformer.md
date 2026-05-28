# Task 11: Implement Auth Directive Transformer with Tests (TDD)

## Objective
Implement the schema transformer that enforces zero-trust authorization using extensions.

## Step 1: Write Tests First

### src/auth/auth.transformer.test.ts
See brief.md Phase 10.4.1 for complete test file content.

Key test cases:
- deny-by-default: throw error for operations without auth extension
- public auth: allow without user
- authed auth: reject without user, allow with user
- owner auth at operation level: log warning, filter out rules
- groups auth: check group membership
- multiple rules: pass if any applicable rule matches
- field auth: owner can read, non-owner denied

## Step 2: Run Tests (Should Fail)
```bash
bun run test:unit src/auth/auth.transformer.test.ts
```

## Step 3: Implement Transformer

### src/auth/auth.transformer.ts
See brief.md Phase 10.4 for complete implementation.

Key functions:
- `getAuthExtension` - extracts auth extension from field config
- `getFieldAuthExtension` - extracts field auth extension
- `checkAuthRule` - checks if user passes auth rule
- `checkFieldPermission` - checks field-level permissions
- `hasPublicAccess` - checks if rules include public access
- `authExtensionTransformer` - transforms schema for operation-level auth
- `fieldAuthExtensionTransformer` - transforms schema for field-level auth
- `combinedAuthTransformer` - combines both transformers

Key error classes:
- `UnauthorizedError` - includes error code for programmatic handling
- `AuthErrorCode` enum - UNAUTHORIZED, MISSING_AUTH, etc.

## Step 4: Run Tests (Should Pass)
```bash
bun run test:unit src/auth/auth.transformer.test.ts
```

## Step 5: Update Barrel Export

Add to src/auth/index.ts:
```typescript
export * from "./auth.transformer";
```

## Acceptance Criteria
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] Deny-by-default enforced (throw error for missing auth)
- [ ] Owner auth at operation level logs warning
- [ ] Groups auth checks membership
- [ ] Field-level auth supports owner checks
- [ ] Error codes included in UnauthorizedError
- [ ] JSDoc documentation on all public functions
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/auth/
bun run lint src/auth/
```
