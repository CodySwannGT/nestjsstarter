# Task: Update docker-compose.yml with Backend Service

**Type:** Task
**Parent:** None

## Description

Update the existing `docker-compose.yml` to add a backend service that runs the local NestJS application. The service should depend on postgres and valkey, configure environment variables for local development, and mount source volumes for hot reload support.

## Acceptance Criteria

- [ ] Backend service added to `docker-compose.yml`
- [ ] Service builds from `Dockerfile.local`
- [ ] Port 3000 exposed and mapped
- [ ] Environment variables configured: IS_OFFLINE, NODE_ENV, DATABASE_*, VALKEY_*
- [ ] Source volume mounted for hot reload (`./src:/app/src`)
- [ ] Service depends on postgres and valkey
- [ ] Existing postgres and valkey services unchanged
- [ ] `docker-compose config` validates successfully

## Relevant Research

**Existing docker-compose.yml** (research.md):
```yaml
services:
  valkey:
    image: valkey/valkey:8-alpine
    ports:
      - '6379:6379'
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: thumbwar
      POSTGRES_PASSWORD: thumbwar_local
      POSTGRES_DB: thumbwar
networks:
  thumbwar-network:
    driver: bridge
volumes:
  valkey_data:
  postgres_data:
```

**Backend Service Pattern** (from brief.md):
```yaml
backend:
  build:
    context: .
    dockerfile: Dockerfile.local
  ports:
    - "3000:3000"
  environment:
    - IS_OFFLINE=true
    - NODE_ENV=development
    - DATABASE_HOST=postgres
    - DATABASE_PORT=5432
    - DATABASE_NAME=thumbwar
    - DATABASE_USER=thumbwar
    - DATABASE_PASSWORD=thumbwar_local
    - VALKEY_HOST=valkey
    - VALKEY_PORT=6379
  volumes:
    - ./src:/app/src:ro
  depends_on:
    - postgres
    - valkey
  command: ["bun", "run", "--watch", "src/main-local.ts"]
```

**Environment Variables** (research.md - src/config/configuration.ts):
- `IS_OFFLINE` - Set to "true" for local development
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `VALKEY_HOST`, `VALKEY_PORT`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - For simplicity principles

## Implementation Details

**File to modify**: `docker-compose.yml`

**Changes required**:
1. Add `backend` service with build context and Dockerfile.local
2. Map port 3000:3000
3. Set environment variables matching existing postgres/valkey config
4. Mount `./src:/app/src` for hot reload (read-only `:ro` is optional)
5. Add `depends_on` for postgres and valkey
6. Override command to use `bun run --watch` for hot reload
7. Add backend service to the existing network

**Database credentials**: Use existing credentials from postgres service:
- User: `thumbwar`
- Password: `thumbwar_local`
- Database: `thumbwar`

**Hot reload**: Use `bun run --watch src/main-local.ts` as command override to enable bun's native file watching.

## Testing Requirements

### Unit Tests
N/A - Docker Compose not unit tested

### Integration Tests
N/A - Verified via docker-compose config

### E2E Tests
N/A - Will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - YAML file uses comments

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
docker-compose config --services | sort
```

### Expected Output
```
backend
postgres
valkey
```

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

N/A - Docker Compose verified via config command.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read current `docker-compose.yml`
2. Add backend service with all required configuration
3. Ensure service is on the same network as postgres/valkey

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - Docker Compose is self-documenting.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
