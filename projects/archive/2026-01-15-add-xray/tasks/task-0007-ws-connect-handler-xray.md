# Task: Add X-Ray initialization to WebSocket connect handler

**Type:** Task
**Parent:** None

## Description

Update `src/websocket/handlers/connect.handler.ts` to initialize X-Ray and wrap the handler logic with subsegment tracing. This enables visibility into WebSocket connection operations in X-Ray traces.

## Acceptance Criteria

- [ ] X-Ray import is the FIRST import in the file
- [ ] `initializeXRay()` is called immediately after import
- [ ] Handler logic is wrapped with `withXRaySubsegment`
- [ ] Subsegment named "WebSocket:Connect"
- [ ] Connection ID added as annotation
- [ ] Existing functionality unchanged
- [ ] TypeScript compiles without errors

## Relevant Research

From brief.md (lines 362-385):
```typescript
// At the top of the file, before other imports
import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

// ... existing imports

export const connect = async (event, context): Promise<...> => {
  return withXRaySubsegment("WebSocket:Connect", async () => {
    // ... existing handler logic
  }, {
    annotations: {
      connectionId: event.requestContext.connectionId,
    },
  });
};
```

From research.md:
- Handler stores connectionId in Valkey (line 48)
- Uses `APIGatewayProxyHandler` type from aws-lambda (line 51)
- Currently has NO X-Ray initialization (line 52)

## Applicable Skills

Invoke these skills before writing implementation code:

- `/coding-philosophy` - Always required for all code
- `/nestjs-rules` - For Lambda handler patterns

## Implementation Details

Modify `src/websocket/handlers/connect.handler.ts`:

1. Add X-Ray imports as FIRST lines
2. Call `initializeXRay()` immediately
3. Wrap handler body with `withXRaySubsegment`
4. Add connectionId as annotation

Files to modify:
- `src/websocket/handlers/connect.handler.ts`

## Testing Requirements

### Unit Tests
N/A - Lambda handler, tested via deployment

### Integration Tests
N/A - requires Lambda and WebSocket environment

### E2E Tests
N/A - infrastructure change

## Documentation Requirements

### Code Documentation (JSDoc)
N/A - adding imports and wrapper only

### Database Comments
N/A - no database changes

### GraphQL Descriptions
N/A - no GraphQL changes

## Verification

### Type
`manual-check`

### Proof Command
```bash
head -5 src/websocket/handlers/connect.handler.ts | grep -q "initializeXRay" && grep -q "withXRaySubsegment" src/websocket/handlers/connect.handler.ts && grep -q "WebSocket:Connect" src/websocket/handlers/connect.handler.ts && echo "SUCCESS: X-Ray added to connect handler" || echo "FAIL: X-Ray not configured"
```

### Expected Output
```
SUCCESS: X-Ray added to connect handler
```

## Implementation Steps

### Step 0: Setup Tracking
Use TodoWrite to create task tracking todos:
- Invoke skills
- Read connect.handler.ts
- Add X-Ray tracing
- Verify implementation
- Commit changes

### Step 1: Invoke Skills
Mark "Invoke skills" as in_progress.

1. Mark this task as "in progress" in `progress.md`
2. Invoke `/coding-philosophy`
3. Invoke `/nestjs-rules`

Mark "Invoke skills" as completed.

### Step 2: Read Handler
Mark "Read connect.handler.ts" as in_progress.

Read current handler to understand structure.

Mark "Read connect.handler.ts" as completed.

### Step 3: Add X-Ray Tracing
Mark "Add X-Ray tracing" as in_progress.

1. Add X-Ray imports at top
2. Call `initializeXRay()`
3. Wrap handler with `withXRaySubsegment`
4. Add connectionId annotation
5. Verify TypeScript compiles: `bun run build`

Mark "Add X-Ray tracing" as completed.

### Step 4: Verify Implementation
Mark "Verify implementation" as in_progress.

1. Run the Proof Command from Verification section
2. Confirm output matches Expected Output

Mark "Verify implementation" as completed.

### Step 5: Commit Changes
Mark "Commit changes" as in_progress.

1. Run `/git:commit`
2. Mark this task as "completed" in `progress.md`

Mark "Commit changes" as completed.
