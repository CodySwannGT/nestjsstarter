# Task: Install aws-xray-sdk-core dependency

**Type:** Task
**Parent:** None

## Description

Install the `aws-xray-sdk-core` package as a production dependency. This package provides the core X-Ray SDK functionality without the heavier database instrumentation modules (postgres, mysql, etc.) that are included in the full `aws-xray-sdk` package.

## Acceptance Criteria

- [ ] `aws-xray-sdk-core` is listed in `dependencies` (not devDependencies) in package.json
- [ ] Package is installed successfully with no peer dependency warnings
- [ ] TypeScript types are available (bundled with the package)

## Relevant Research

From research.md:
- `aws-xray-sdk-core` is NOT currently installed (research.md line 86)
- The lighter `-core` variant is preferred over full `aws-xray-sdk` (brief.md line 73)
- Existing code at `src/database/typeorm-xray-logger.ts` uses dynamic require for graceful degradation

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

1. Run `bun add aws-xray-sdk-core` to install the package
2. Verify package.json has the dependency listed
3. Run `bun install` to ensure lock file is updated

## Testing Requirements

### Unit Tests
N/A - no code changes, just dependency installation

### Integration Tests
N/A - no integration points

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - no code changes

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
grep -q '"aws-xray-sdk-core"' package.json && echo "SUCCESS: aws-xray-sdk-core found in package.json" || echo "FAIL: aws-xray-sdk-core not found"
```

### Expected Output
```
SUCCESS: aws-xray-sdk-core found in package.json
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Install dependency
- Verify installation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`

Mark "Invoke skills" as completed.

### Step 2: Install Dependency
Mark "Install dependency" as in_progress.

Run: `bun add aws-xray-sdk-core`

Mark "Install dependency" as completed.

### Step 3: Verify Installation
Mark "Verify installation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output

Mark "Verify installation" as completed.

### Step 4: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
