# Task: Add Aurora VPC configuration placeholder to serverless.yml

**Type:** Task
**Parent:** None

## Description

Add commented VPC configuration placeholders to serverless.yml for future Aurora Serverless v2 integration. This documents the production requirements without implementing them.

## Acceptance Criteria

- [ ] VPC configuration section added as comments in serverless.yml
- [ ] Security group configuration documented
- [ ] Environment variable placeholders for SSM/Secrets Manager documented
- [ ] RDS Proxy consideration documented
- [ ] Comments clearly indicate this is for production Aurora setup

## Relevant Research

**Aurora Integration Requirements** (research.md):
- VPC configuration needed for Lambda to access Aurora
- Security group allowing port 5432
- Environment variables from SSM/Secrets Manager
- Consider RDS Proxy for connection pooling

**RDS Proxy for Production** (research.md, Q1 Answer):
- Yes, use RDS Proxy for production Lambda-to-Aurora connections

**Serverless Configuration** (research.md):
- Runtime: `nodejs22.x`
- Region: `us-east-1`
- Main handler timeout: 29 seconds
- Uses serverless-esbuild for bundling

**Reference file**: `serverless.yml`

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**File to modify**: `serverless.yml`

**Comments to add** (as YAML comments in appropriate sections):

```yaml
# Production VPC Configuration for Aurora Serverless v2
# Uncomment and configure when deploying to production
#
# provider:
#   vpc:
#     securityGroupIds:
#       - ${ssm:/thumbwar/${self:provider.stage}/vpc/security-group-id}
#     subnetIds:
#       - ${ssm:/thumbwar/${self:provider.stage}/vpc/subnet-id-1}
#       - ${ssm:/thumbwar/${self:provider.stage}/vpc/subnet-id-2}
#
# Environment Variables for Aurora (add to provider.environment):
#   DATABASE_HOST: ${ssm:/thumbwar/${self:provider.stage}/database/host}
#   DATABASE_PORT: ${ssm:/thumbwar/${self:provider.stage}/database/port}
#   DATABASE_USER: ${ssm:/thumbwar/${self:provider.stage}/database/user}
#   DATABASE_PASSWORD: ${ssm:/thumbwar/${self:provider.stage}/database/password~true}
#   DATABASE_NAME: ${ssm:/thumbwar/${self:provider.stage}/database/name}
#   DATABASE_SSL: true
#
# Note: For production, use RDS Proxy for connection pooling:
#   DATABASE_HOST should point to RDS Proxy endpoint
#   Configure IAM authentication for enhanced security
```

## Testing Requirements

### Unit Tests
N/A - Configuration comments, no unit tests required

### Integration Tests
N/A - Configuration comments

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - YAML configuration file

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q "Aurora Serverless" serverless.yml && grep -q "RDS Proxy" serverless.yml && echo "Aurora configuration placeholder added"
```

### Expected Output
```text
Aurora configuration placeholder added
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

N/A - Configuration comments task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Read `serverless.yml`
2. Add VPC configuration comments in appropriate section
3. Add environment variable placeholder comments
4. Add RDS Proxy documentation comment

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm Aurora and RDS Proxy comments are present
3. If verification fails, fix and re-verify

Mark "Verify implementation" as completed.

### Step 5: Update Documentation
Mark "Update documentation" as in_progress.

N/A - The comments serve as documentation.

Mark "Update documentation" as completed.

### Step 6: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
