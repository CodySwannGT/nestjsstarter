We need to support GraphQL subscriptions following best practices for Apollo and NestJS.

The technology behind it should be Amazon API Gateway WebSocket APIs.

Importantly, when creating the graphql api, every mutation should also include a subscription when created (i.e. onCreate, onUpdate, onDelete, etc, etc).