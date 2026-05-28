# Task 16: Verify End-to-End Local Server Functionality

## Objective
Verify all components work together by starting the local server and testing endpoints.

## Verification Steps

### 1. Run All Tests
```bash
bun run test:unit
bun run test:integration
```

### 2. Run Linting
```bash
bun run lint
```

### 3. Run Type Check
```bash
bun run build
```

### 4. Start Local Server
```bash
bun run start:local
```

### 5. Test GraphQL Endpoint
Using curl or GraphQL client at http://localhost:3000/graphql:

**Test hello query (public):**
```graphql
query { hello }
```
Expected: `"Hello World"`

**Test greet mutation (requires auth - should fail without auth):**
```graphql
mutation { greet(name: "Test") }
```
Expected: 401 Unauthorized error

**Test greetBatched query (requires auth - should fail without auth):**
```graphql
query { greetBatched(name: "Test") }
```
Expected: 401 Unauthorized error

### 6. Test Health Endpoint
```bash
curl http://localhost:3000/health
```
Expected: `{ "status": "ok", "timestamp": "2024-01-15T..." }`

### 7. Verify Schema Generation
After starting local server, check that `src/schema.gql` was generated.

## Expected GraphQL Schema
```graphql
type Mutation {
  """Returns personalized greeting"""
  greet(name: String!): String!
}

type Query {
  """Returns greeting via DataLoader"""
  greetBatched(name: String!): String!

  """Returns Hello World greeting"""
  hello: String!
}
```

## Acceptance Criteria
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Linting passes
- [ ] Type check passes
- [ ] Local server starts without errors
- [ ] hello query returns "Hello World"
- [ ] greet mutation requires authentication
- [ ] greetBatched query requires authentication
- [ ] Health endpoint returns ok status
- [ ] Schema file generated in src/

## Final Project Structure
```
src/
├── auth/
│   ├── decorators/
│   │   ├── auth-authed.decorator.ts
│   │   ├── auth-groups.decorator.ts
│   │   ├── auth-owner.decorator.ts
│   │   ├── auth-public.decorator.ts
│   │   └── field-auth.decorator.ts
│   ├── auth.module.ts
│   ├── auth.transformer.ts
│   ├── auth.transformer.test.ts
│   ├── auth.types.ts
│   └── index.ts
├── data-loader/
│   ├── data-loader.interface.ts
│   ├── data-loader.module.ts
│   ├── data-loader.service.ts
│   └── data-loader.service.test.ts
├── graphql/
│   ├── complexity.plugin.ts
│   └── complexity.plugin.test.ts
├── health/
│   ├── health.controller.ts
│   ├── health.controller.test.ts
│   └── health.module.ts
├── hello/
│   ├── hello.module.ts
│   ├── hello.resolver.ts
│   ├── hello.resolver.test.ts
│   ├── hello.service.ts
│   └── hello.service.test.ts
├── app.module.ts
├── main.ts
└── schema.gql (generated)
jest.config.ts
nest-cli.json
serverless.yml
```
