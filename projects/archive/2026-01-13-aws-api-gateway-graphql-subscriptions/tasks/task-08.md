---
id: task-08
title: Create WebSocket Lambda Authorizer
status: pending
priority: high
phase: 3
---

# Create WebSocket Lambda Authorizer

## Objective

Create custom Lambda authorizer that validates JWT tokens for WebSocket connections.

## Requirements

1. Create `src/websocket/authorizer/ws-authorizer.handler.ts`
2. Extract JWT token from query string parameter (`?token=...`)
3. Validate JWT using same logic as HTTP API auth
4. Return IAM policy allowing/denying connection
5. Pass user context (userId, groups) in authorizer context

## Implementation Details

```typescript
export const wsAuthorizer: APIGatewayAuthorizerHandler = async (event) => {
  const token = event.queryStringParameters?.token;

  if (!token) {
    throw new Error('Unauthorized');
  }

  const decoded = await validateJwt(token);

  return {
    principalId: decoded.sub,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: event.methodArn,
      }],
    },
    context: {
      userId: decoded.sub,
      groups: JSON.stringify(decoded['cognito:groups'] ?? []),
    },
  };
};
```

## Files to Create

- `/Users/cody/workspace/thumbwar/backend/src/websocket/authorizer/ws-authorizer.handler.ts`
- `/Users/cody/workspace/thumbwar/backend/src/websocket/authorizer/index.ts`

## Code References

- Current auth pattern: `src/auth/auth.transformer.ts`
- Auth decorators: `src/auth/decorators/`

## Acceptance Criteria

- [ ] Extracts token from query string
- [ ] Validates JWT signature and claims
- [ ] Returns Allow policy for valid tokens
- [ ] Throws error for invalid/missing tokens (results in 401)
- [ ] Passes user context in authorizer response
- [ ] JSDoc documentation on handler

## Dependencies

- task-04 (authorizer referenced in serverless.yml)
