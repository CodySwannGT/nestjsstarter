---
id: task-04
title: Add WebSocket API Gateway Configuration
status: pending
priority: high
phase: 2
---

# Add WebSocket API Gateway Configuration

## Objective

Update serverless.yml to configure WebSocket API Gateway routes for GraphQL subscriptions.

## Requirements

1. Add WebSocket API Gateway configuration to provider section
2. Configure route selection expression for GraphQL-WS protocol
3. Add Lambda functions for $connect, $disconnect, $default routes
4. Configure appropriate IAM permissions for API Gateway Management API

## Implementation Details

```yaml
provider:
  websocketsApiName: ${self:service}-websockets-${sls:stage}
  websocketsApiRouteSelectionExpression: $request.body.type

functions:
  wsConnect:
    handler: src/websocket/handlers.connect
    events:
      - websocket:
          route: $connect
          authorizer:
            name: wsAuthorizer
            identitySource:
              - route.request.querystring.token

  wsDisconnect:
    handler: src/websocket/handlers.disconnect
    events:
      - websocket:
          route: $disconnect

  wsDefault:
    handler: src/websocket/handlers.default
    events:
      - websocket:
          route: $default
```

## Files to Modify

- `/Users/cody/workspace/thumbwar/backend/serverless.yml`

## Code References

- Current config: `serverless.yml:1-67`
- Research: WebSocket configuration example in research.md

## Acceptance Criteria

- [ ] WebSocket API Gateway configured in serverless.yml
- [ ] $connect route with authorizer placeholder
- [ ] $disconnect route configured
- [ ] $default route configured
- [ ] IAM permissions for execute-api:ManageConnections
- [ ] `sls print` validates configuration

## Dependencies

None - serverless config can be added before handlers exist.
