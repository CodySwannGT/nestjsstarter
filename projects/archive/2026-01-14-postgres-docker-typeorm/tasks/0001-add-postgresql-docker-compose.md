# Task: Add PostgreSQL service to docker-compose.yml

**Type:** Task
**Parent:** None

## Description

Add a PostgreSQL 15 service to the existing docker-compose.yml file following the established pattern from the Valkey service configuration. This will enable local development against a PostgreSQL database.

## Acceptance Criteria

- [ ] PostgreSQL service added using `postgres:15-alpine` image
- [ ] Container named `thumbwar-postgres`
- [ ] Port 5432 mapped to host
- [ ] Named volume `postgres_data` created for data persistence
- [ ] Health check configured using `pg_isready`
- [ ] Service added to `thumbwar-network`
- [ ] Restart policy set to `unless-stopped`

## Relevant Research

**Docker Compose Infrastructure** (research.md):
- Current structure uses named network `thumbwar-network` with bridge driver
- Named volumes use local driver
- Health checks include interval, timeout, retries, start_period
- Restart policy: `unless-stopped`

**Pattern from Valkey service** (`docker-compose.yml`):
- Uses alpine image variant
- Health check with CLI command
- Connected to thumbwar-network

**Example configuration** (brief.md):
```yaml
postgres:
  image: postgres:15-alpine
  container_name: thumbwar-postgres
  ports:
    - '5432:5432'
  environment:
    POSTGRES_USER: thumbwar
    POSTGRES_PASSWORD: thumbwar_local
    POSTGRES_DB: thumbwar
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U thumbwar -d thumbwar']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
  networks:
    - thumbwar-network
  restart: unless-stopped
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to modify**: `docker-compose.yml`

**Changes**:
1. Add `postgres` service definition after the `valkey` service
2. Add `postgres_data` volume to the volumes section

**Configuration values**:
- Image: `postgres:15-alpine`
- Container name: `thumbwar-postgres`
- Port: `5432:5432`
- Environment variables:
  - `POSTGRES_USER: thumbwar`
  - `POSTGRES_PASSWORD: thumbwar_local`
  - `POSTGRES_DB: thumbwar`
- Volume: `postgres_data:/var/lib/postgresql/data`
- Health check: `pg_isready -U thumbwar -d thumbwar`

## Testing Requirements

### Unit Tests
N/A - Infrastructure configuration, no unit tests required

### Integration Tests
N/A - Will be tested by starting the container

### E2E Tests
N/A - No user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - YAML configuration file

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
docker compose config --services | grep -q postgres && docker compose up -d postgres && sleep 5 && docker compose ps postgres --format "{{.Status}}" | grep -q "healthy"
```

### Expected Output
The command should complete successfully (exit code 0), indicating:
- `postgres` service is defined in docker-compose.yml
- Container starts successfully
- Health check passes (status shows "healthy")

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
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

N/A - Infrastructure configuration task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read `docker-compose.yml`
2. Add postgres service definition following Valkey pattern
3. Add postgres_data volume to volumes section

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm PostgreSQL container starts and becomes healthy
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - No documentation requirements for this task.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
