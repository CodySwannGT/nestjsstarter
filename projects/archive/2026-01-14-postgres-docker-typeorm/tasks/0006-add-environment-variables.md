# Task: Add database environment variables

**Type:** Task
**Parent:** None

## Description

Add database connection environment variables to the development environment file and create an example file for documentation purposes.

## Acceptance Criteria

- [ ] Database environment variables added to `.env.development`
- [ ] `.env.example` created (or updated if exists) with database variables
- [ ] All required variables present: HOST, PORT, USER, PASSWORD, NAME, SSL
- [ ] Default values match local Docker PostgreSQL configuration
- [ ] Production notes included as comments in `.env.example`

## Relevant Research

**Environment Variables** (brief.md):
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=thumbwar
DATABASE_PASSWORD=thumbwar_local
DATABASE_NAME=thumbwar
DATABASE_SSL=false
```

**Production notes** (brief.md):
- For Aurora Serverless, use:
  - `DATABASE_HOST` from AWS Secrets Manager or SSM Parameter Store
  - `DATABASE_SSL=true` for secure connections
  - Consider using IAM database authentication

**Current Valkey pattern** (research.md):
- `VALKEY_HOST` (default: `localhost`)
- `VALKEY_PORT` (default: `6379`)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**Files to modify/create**:
- `.env.development` (modify if exists, create if not)
- `.env.example` (create if not exists)

**Variables to add**:
```bash
# Database Configuration (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=thumbwar
DATABASE_PASSWORD=thumbwar_local
DATABASE_NAME=thumbwar
DATABASE_SSL=false
```

**For .env.example, add comments**:
```bash
# Database Configuration (PostgreSQL)
# For local development with Docker:
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=thumbwar
DATABASE_PASSWORD=thumbwar_local
DATABASE_NAME=thumbwar
DATABASE_SSL=false

# For production (Aurora Serverless v2):
# DATABASE_HOST=<from-aws-secrets-manager>
# DATABASE_PORT=5432
# DATABASE_USER=<from-aws-secrets-manager>
# DATABASE_PASSWORD=<from-aws-secrets-manager>
# DATABASE_NAME=thumbwar
# DATABASE_SSL=true
```

## Testing Requirements

### Unit Tests
N/A - Environment configuration, no unit tests required

### Integration Tests
N/A - Environment configuration

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - Environment files

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q "DATABASE_HOST" .env.example && grep -q "DATABASE_SSL" .env.example && echo "Environment variables configured"
```

### Expected Output
```text
Environment variables configured
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

N/A - Environment configuration task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Check if `.env.development` exists and read it
2. Add database variables to `.env.development`
3. Check if `.env.example` exists and read it
4. Create/update `.env.example` with database variables and production comments
5. Ensure `.env.development` is in `.gitignore` (should be, verify)
6. Ensure `.env.example` is NOT in `.gitignore`

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm database variables are present
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - The .env.example file serves as documentation.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Note: Only commit `.env.example`, not `.env.development` (which should be gitignored).

Mark "Commit changes" as completed.
