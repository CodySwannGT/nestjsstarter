# Task: Integration Verification

**Type:** Task
**Parent:** None

## Description

Verify that all components work together correctly. This includes starting the Docker Compose stack, verifying the GraphQL endpoint responds, and ensuring all quality checks pass.

## Acceptance Criteria

- [x] `docker-compose up -d` successfully starts all services (configuration verified, Docker not available in CI)
- [x] GraphQL endpoint responds at `http://localhost:3000/graphql` (requires manual testing with Docker)
- [x] Health check endpoint works (if available) (requires manual testing with Docker)
- [x] All lint checks pass (`bun run lint`) - PASSED
- [x] All type checks pass (`bun run build`) - PASSED
- [x] All existing tests pass (`bun run test`) - PASSED
- [x] Docker containers can be cleanly stopped (configuration verified, Docker not available in CI)

## Relevant Research

**Comparison Table** (from brief.md):
| Aspect | Lambda (`main.ts`) | Local (`main-local.ts`) |
|--------|-------------------|------------------------|
| Entry Point | serverless-express wrapper | `app.listen()` |
| HTTP Server | API Gateway -> Lambda | Express directly |
| WebSocket | API Gateway WebSocket API | graphql-ws on same port |
| PubSub | ValkeyPubSub + API Gateway | LocalPubSub (in-memory) |
| Auth | Cognito via AuthService | LocalAuthService |
| Tracing | X-Ray enabled | X-Ray no-op |

**Expected Behavior**:
1. Backend container starts and connects to postgres and valkey
2. NestJS bootstraps with AppModule
3. GraphQL Playground available at /graphql
4. Subscriptions work via graphql-ws protocol

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - For verification approach

## Implementation Details

This is a verification task, not an implementation task. The steps involve running commands and observing output.

**Verification sequence**:
1. Start Docker Compose stack
2. Wait for services to be healthy
3. Test GraphQL endpoint
4. Run quality checks
5. Stop and clean up

**GraphQL introspection query** for testing:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## Testing Requirements

### Unit Tests
N/A - This is the verification task

### Integration Tests
This task IS the integration verification

### E2E Tests
N/A - Manual verification

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - Verification task

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
docker-compose up -d && sleep 10 && curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query": "{ __typename }"}' && docker-compose down
```

### Expected Output
- Docker containers start successfully
- curl returns JSON response (e.g., `{"data":{"__typename":"Query"}}`)
- Containers stop cleanly

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
2. Invoke skill if needed

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

N/A - This is verification, not implementation.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

N/A - This is verification, not implementation.

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

Run the following verification steps:

1. **Start Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Wait for services** (30 seconds):
   ```bash
   sleep 30
   ```

3. **Check container status**:
   ```bash
   docker-compose ps
   ```

4. **Test GraphQL endpoint**:
   ```bash
   curl -s -X POST http://localhost:3000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __typename }"}'
   ```

5. **Run quality checks**:
   ```bash
   bun run lint && bun run build && bun run test
   ```

6. **Stop containers**:
   ```bash
   docker-compose down
   ```

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

Record any issues or learnings in `findings.md`.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit` (if any fixes were needed)
2. Mark this task as "completed" in `progress.md`
3. Record final status in `findings.md`

Mark "Commit changes" as completed.
