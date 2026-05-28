# Task: Create Dockerfile.local

**Type:** Task
**Parent:** None

## Description

Create a Dockerfile specifically for local development that uses the Bun runtime, supports hot reload via volume mounts, and runs the `main-local.ts` entry point.

## Acceptance Criteria

- [ ] `Dockerfile.local` created in project root
- [ ] Uses `oven/bun:1` base image
- [ ] Copies package.json and bun.lockb for dependency installation
- [ ] Runs `bun install` for dependencies
- [ ] Copies source code
- [ ] Exposes port 3000
- [ ] Default CMD runs `bun run src/main-local.ts`
- [ ] File is properly formatted
- [ ] Docker build succeeds

## Relevant Research

**Dockerfile Pattern** (from brief.md):
```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/main-local.ts"]
```

**Package Manager** (research.md):
- Project uses bun (>= 1.3.5)
- Lock file is `bun.lockb`

**Hot Reload** (Q4 Answer):
- Hot reload support is required
- Achieved through volume mounts in docker-compose.yml, not Dockerfile changes

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - For simplicity principles (KISS)

## Implementation Details

**File to create**: `Dockerfile.local`

**Implementation approach**:
1. Use multi-stage or simple single-stage build
2. Start from `oven/bun:1` base image
3. Set WORKDIR to `/app`
4. Copy dependency files first (layer caching optimization)
5. Run `bun install`
6. Copy remaining source files
7. Expose port 3000
8. Set CMD to run main-local.ts with bun

**Hot reload consideration**: The actual hot reload happens through volume mounts in docker-compose.yml that mount `./src:/app/src`. The Dockerfile just needs to support running from source.

**Note**: Consider using `bun run --watch src/main-local.ts` for native bun file watching, or rely on volume mounts for hot reload.

## Testing Requirements

### Unit Tests
N/A - Dockerfile not unit tested

### Integration Tests
N/A - Verified via docker build

### E2E Tests
N/A - Will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - Dockerfile uses comments

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
docker build -f Dockerfile.local -t thumbwar-local . 2>&1 | tail -5
```

### Expected Output
- Build completes successfully
- Final lines show successful image creation

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

N/A - Dockerfile verified via build command.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

Create `Dockerfile.local` with the specified structure.

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - Dockerfile is self-documenting via comments.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
