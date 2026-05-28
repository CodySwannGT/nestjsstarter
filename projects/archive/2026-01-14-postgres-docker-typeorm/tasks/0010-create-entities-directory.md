# Task: Create entities directory structure

**Type:** Task
**Parent:** None

## Description

Create the entities directory structure within the database folder. This directory serves as a reference location and can hold shared base entity classes.

## Acceptance Criteria

- [ ] `src/database/entities/` directory created
- [ ] `.keep` file added to preserve empty directory in git
- [ ] Directory structure documented for future entity placement

## Relevant Research

**Entity pattern** (brief.md):
- Entities should follow this structure:
  - Place in feature module directory (e.g., src/user/user.entity.ts)
  - Use class-validator decorators for validation
  - Use class-transformer for serialization
  - Register in DatabaseModule entities array or use autoLoadEntities

**Entity Registration Strategy** (research.md, Q3 Answer):
- Use `autoLoadEntities: true` for simpler entity registration
- Entities are auto-discovered from feature modules

**Entity path from typeorm.config.ts**:
```typescript
entities: ['src/**/*.entity.ts']
```

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code

## Implementation Details

**Directory to create**: `src/database/entities/`

**Files to create**:
- `src/database/entities/.keep` (empty file)

The `.keep` file ensures the empty directory is tracked by git. Individual entities will be placed in their respective feature module directories (e.g., `src/user/user.entity.ts`).

## Testing Requirements

### Unit Tests
N/A - Directory structure, no unit tests required

### Integration Tests
N/A - Directory structure

### E2E Tests
N/A - no user-facing changes

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - Directory structure

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
test -d src/database/entities && test -f src/database/entities/.keep && echo "Entities directory created"
```

### Expected Output
```text
Entities directory created
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

N/A - Directory structure task, no tests required.

Mark "Write failing tests" as completed.

### Step 3: Write Implementation
Mark "Write implementation" as in_progress.

1. Create `src/database/entities/` directory
2. Create `.keep` file in the directory

Mark "Write implementation" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm directory and .keep file exist
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
