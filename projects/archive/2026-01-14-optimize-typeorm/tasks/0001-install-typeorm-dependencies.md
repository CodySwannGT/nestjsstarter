# Task: Install TypeORM Dependencies

**Type:** Task
**Parent:** None

## Description

Install the required npm packages for TypeORM optimization:
- `typeorm-naming-strategies` - Provides `SnakeNamingStrategy` for consistent database column naming
- `@aws-sdk/rds-signer` (runtime dependency) - Provides IAM authentication for RDS connections in production

## Acceptance Criteria

- [ ] `typeorm-naming-strategies` is listed in `dependencies` in package.json
- [ ] `@aws-sdk/rds-signer` is listed in `dependencies` in package.json
- [ ] `bun install` completes without errors
- [ ] Lock file is updated with new dependencies

## Relevant Research

From research.md "Package Dependencies" section:

| Package | Version | Purpose |
|---------|---------|---------|
| `typeorm-naming-strategies` | latest | For `SnakeNamingStrategy` |
| `@aws-sdk/rds-signer` | latest | For IAM authentication |

The brief specifies these exact installation commands:
```bash
bun add typeorm-naming-strategies @aws-sdk/rds-signer
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

1. Run `bun add typeorm-naming-strategies @aws-sdk/rds-signer` to install both packages
2. Verify packages are in package.json

**Files to modify:**
- `package.json` - Will be modified by bun add commands
- `bun.lockb` - Will be updated automatically

## Testing Requirements

### Unit Tests
N/A - Dependency installation only

### Integration Tests
N/A - Dependency installation only

### E2E Tests
N/A - Dependency installation only

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - No code changes

### Database Comments
N/A - No database changes

### GraphQL Descriptions
N/A - No GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
cd /Users/cody/workspace/thumbwar/backend && cat package.json | grep -E '"typeorm-naming-strategies"|"@aws-sdk/rds-signer"'
```

### Expected Output
Both packages should appear in package.json:
- `"typeorm-naming-strategies": "^x.x.x"` in dependencies
- `"@aws-sdk/rds-signer": "^x.x.x"` in dependencies

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Install dependencies
- Verify installation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy` skill

Mark "Invoke skills" as completed.

### Step 2: Install Dependencies
Mark "Install dependencies" as in_progress.

Run the following command:
```bash
bun add typeorm-naming-strategies @aws-sdk/rds-signer
```

Mark "Install dependencies" as completed.

### Step 3: Verify Installation
Mark "Verify installation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm both packages appear in package.json
3. Run `bun install` to ensure lock file is consistent

Mark "Verify installation" as completed.

### Step 4: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`
3. Record any learnings in `findings.md`

Mark "Commit changes" as completed.
