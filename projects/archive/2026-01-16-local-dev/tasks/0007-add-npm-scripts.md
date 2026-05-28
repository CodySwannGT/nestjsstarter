# Task: Add npm Scripts for Docker Compose

**Type:** Task
**Parent:** None

## Description

Add convenience npm scripts to `package.json` for managing the Docker Compose local development environment. These scripts should make it easy to start, rebuild, and stop the local development stack.

## Acceptance Criteria

- [ ] `start:docker` script added - runs `docker-compose up`
- [ ] `start:docker:build` script added - runs `docker-compose up --build`
- [ ] `start:docker:down` script added - runs `docker-compose down`
- [ ] Scripts are properly formatted in package.json
- [ ] `bun run start:docker --help` shows docker-compose help

## Relevant Research

**Scripts Pattern** (from brief.md):
```json
{
  "scripts": {
    "start:docker": "docker-compose up",
    "start:docker:build": "docker-compose up --build",
    "start:docker:down": "docker-compose down"
  }
}
```

**Existing Scripts** (package.json):
- `start:local` - Uses serverless-offline
- `start:dev` - Uses serverless-offline with dev stage

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - For simplicity principles

## Implementation Details

**File to modify**: `package.json`

**Changes required**:
Add three new scripts in the scripts section:
1. `"start:docker": "docker-compose up"` - Start all services in foreground
2. `"start:docker:build": "docker-compose up --build"` - Rebuild and start
3. `"start:docker:down": "docker-compose down"` - Stop and remove containers

**Placement**: Add after the existing `start:*` scripts for logical grouping.

**Note**: Use `docker-compose` command (hyphenated) for broader compatibility, though `docker compose` (space) also works with newer Docker versions.

## Testing Requirements

### Unit Tests
N/A - Script configuration not unit tested

### Integration Tests
N/A - Verified via bun run

### E2E Tests
N/A - Will be verified in Task 8

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - package.json scripts are self-documenting by name

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
bun run start:docker:down 2>&1 || true && grep -A1 '"start:docker"' package.json
```

### Expected Output
```
    "start:docker": "docker-compose up",
    "start:docker:build": "docker-compose up --build",
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

N/A - Script configuration verified via grep.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read current `package.json`
2. Add new scripts after existing start:* scripts
3. Maintain proper JSON formatting

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - Scripts are self-documenting.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
