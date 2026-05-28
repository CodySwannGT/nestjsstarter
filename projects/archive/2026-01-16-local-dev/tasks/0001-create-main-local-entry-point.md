# Task: Create Local Entry Point (main-local.ts)

**Type:** Task
**Parent:** None

## Description

Create an alternate NestJS entry point (`src/main-local.ts`) for local development that starts a standard HTTP server with built-in graphql-ws subscription support. This eliminates the need for serverless-express wrapper and Lambda event/context model, providing a simpler development experience.

## Acceptance Criteria

- [ ] `src/main-local.ts` creates NestJS application using `NestFactory.create()`
- [ ] Application listens on port 3000 using `app.listen()`
- [ ] CORS is configured to allow all origins for local development
- [ ] GraphQL subscriptions enabled via graphql-ws protocol
- [ ] Console output shows server URL and GraphQL Playground URL
- [ ] File includes proper JSDoc preamble with @file, @description, @module tags
- [ ] Lint and type checks pass

## Relevant Research

**Entry Point Architecture** (research.md):
- Lambda entry point pattern from `src/main.ts:1-67`
- Uses same `AppModule` for both entry points
- CORS configuration pattern: `{ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE", preflightContinue: false, optionsSuccessStatus: 204 }`

**X-Ray Tracing** (research.md):
- Already handles IS_OFFLINE=true gracefully in `src/tracing/xray.config.ts:42-55`
- No changes needed to tracing module

**GraphQL Subscriptions** (Q3 Answer):
- Follow NestJS/GraphQL community conventions
- Use built-in graphql-ws support on same port as HTTP

**Code Reference** from brief.md:
```typescript
const app = await NestFactory.create(AppModule, {
  cors: {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
});
const port = 3000;
await app.listen(port);
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/jsdoc-best-practices` - Required for file preamble documentation
- `/nestjs-rules` - Required for NestJS entry point patterns

## Implementation Details

**File to create**: `src/main-local.ts`

**Implementation approach**:
1. Import `NestFactory` from `@nestjs/core`
2. Import `AppModule` from `./app.module`
3. Create bootstrap function that:
   - Creates NestJS app with CORS configuration
   - Calls `app.listen(3000)`
   - Logs server URLs to console
4. Call bootstrap() at module level

**Note**: GraphQL subscription support (graphql-ws) is typically configured in the GraphQL module, not the entry point. The entry point just needs to start the HTTP server; the GraphQL module's configuration handles WebSocket upgrade for subscriptions.

**Do NOT**:
- Import or initialize X-Ray (handled automatically by tracing module's IS_OFFLINE check)
- Use serverless-express wrapper
- Create a separate WebSocket server

## Testing Requirements

### Unit Tests
N/A - Entry point files are not unit tested. Verification is done via integration testing.

### Integration Tests
N/A - Will be verified in Task 8 (Integration verification)

### E2E Tests
N/A - Will be verified in Task 8 (Integration verification)

## Documentation Requirements

### Code Documentation (JSDoc)
- [ ] File preamble with `@file main-local.ts`, `@description Local development entry point for Docker Compose`, `@module main-local`
- [ ] `bootstrap()` function with `@description` explaining it starts a standard HTTP server without Lambda wrapper

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run lint && bun run build
```

### Expected Output
- No lint errors
- TypeScript compilation succeeds with no errors
- File `src/main-local.ts` exists with proper structure

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

N/A - Entry point files are not unit tested.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

Create `src/main-local.ts` with:
1. JSDoc preamble
2. Import statements
3. Bootstrap function with CORS config
4. Console output for server URLs
5. Bootstrap call

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
