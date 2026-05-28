# Task: Add X-Ray tracing configuration to serverless.yml

**Type:** Task
**Parent:** None

## Description

Configure AWS X-Ray tracing in serverless.yml by enabling Lambda and API Gateway tracing, and adding the required IAM permissions for X-Ray to send trace data.

## Acceptance Criteria

- [ ] `provider.tracing.lambda` is set to `true`
- [ ] `provider.tracing.apiGateway` is set to `true`
- [ ] IAM role includes `xray:PutTraceSegments` permission
- [ ] IAM role includes `xray:PutTelemetryRecords` permission
- [ ] Serverless configuration is valid (no syntax errors)

## Relevant Research

From research.md:
- serverless.yml currently has NO X-Ray tracing configuration (line 64)
- IAM role only has `execute-api:ManageConnections` permission (line 65)
- Configuration needed is documented at lines 67-81

Required YAML structure:
```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - 'xray:PutTraceSegments'
            - 'xray:PutTelemetryRecords'
          Resource: '*'
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - Covers serverless deployment configuration patterns

## Implementation Details

1. Open `serverless.yml`
2. Add `tracing` section under `provider` block
3. Add X-Ray IAM permissions to existing `iam.role.statements` array
4. Preserve all existing configuration

Files to modify:
- `serverless.yml` - Add tracing config and IAM permissions

## Testing Requirements

### Unit Tests
N/A - infrastructure configuration only

### Integration Tests
N/A - no integration points

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
grep -A2 'tracing:' serverless.yml | grep -q 'lambda: true' && grep -q 'xray:PutTraceSegments' serverless.yml && echo "SUCCESS: X-Ray config found in serverless.yml" || echo "FAIL: X-Ray config missing"
```

### Expected Output
```
SUCCESS: X-Ray config found in serverless.yml
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read serverless.yml
- Add tracing configuration
- Verify configuration
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/nestjs-rules`

Mark "Invoke skills" as completed.

### Step 2: Read serverless.yml
Mark "Read serverless.yml" as in_progress.

Read the current serverless.yml to understand existing structure.

Mark "Read serverless.yml" as completed.

### Step 3: Add Tracing Configuration
Mark "Add tracing configuration" as in_progress.

1. Add `tracing` section under `provider`
2. Add IAM statements for X-Ray permissions

Mark "Add tracing configuration" as completed.

### Step 4: Verify Configuration
Mark "Verify configuration" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output

Mark "Verify configuration" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
