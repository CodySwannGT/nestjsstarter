# Task: Install @nestjs/terminus for health checks

**Type:** Task
**Parent:** None

## Description

Install the @nestjs/terminus package which provides health check indicators including TypeOrmHealthIndicator for database connectivity checks.

## Acceptance Criteria

- [ ] `@nestjs/terminus` package installed
- [ ] Package added to production dependencies in package.json
- [ ] Lock file updated with new dependency

## Relevant Research

**Health Check Approach** (research.md, Q2 Answer):
- Use @nestjs/terminus for health checks
- Always prefer existing solutions over custom implementations

**Current Health Implementation** (research.md):
- Simple REST controller at `/health`
- Returns `{ status: "ok", timestamp: ISO string }`
- No database connectivity checks currently

**External resources** (research.md):
- [NestJS Terminus GitHub](https://github.com/nestjs/terminus)
- [TypeOrmHealthIndicator Source](https://github.com/nestjs/terminus/blob/master/lib/health-indicator/database/typeorm.health.ts)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to modify**: `package.json`

**Command to run**:
```bash
bun add @nestjs/terminus
```

This will:
1. Add @nestjs/terminus to dependencies in package.json
2. Update bun.lockb with resolved version

## Testing Requirements

### Unit Tests
N/A - Dependency installation, no unit tests required

### Integration Tests
N/A - Dependencies will be tested in subsequent task

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - Package installation

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q '"@nestjs/terminus"' package.json && echo "@nestjs/terminus installed"
```

### Expected Output
```text
@nestjs/terminus installed
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
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Write Failing Tests
Mark "Write failing tests" as in_progress.

N/A - Dependency installation task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

Run the installation command:
```bash
bun add @nestjs/terminus
```

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm @nestjs/terminus appears in package.json dependencies
3. If verification fails, check for installation errors and retry

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
