# Task 1: Install NestJS, GraphQL, and Serverless Dependencies

## Objective
Install all required dependencies for NestJS + Express + Serverless + GraphQL backend.

## Dependencies to Install

### Core NestJS
```bash
bun add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
```

### GraphQL
```bash
bun add @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

### DataLoader
```bash
bun add dataloader
```

### GraphQL Tools (for auth transformer)
```bash
bun add @graphql-tools/utils
```

### Query Complexity
```bash
bun add graphql-query-complexity
```

### Serverless
```bash
bun add @vendia/serverless-express
bun add -D @types/aws-lambda serverless serverless-esbuild serverless-offline
```

### NestJS CLI & Testing
```bash
bun add -D @nestjs/cli@latest @nestjs/schematics@latest @nestjs/testing@latest ts-jest @types/express
```

## Acceptance Criteria
- [ ] All dependencies installed successfully
- [ ] No version conflicts
- [ ] package.json updated with new dependencies
- [ ] bun.lockb updated

## Commands to Run
```bash
cd /Users/cody/workspace/thumbwar/backend
bun add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
bun add @nestjs/graphql @nestjs/apollo @apollo/server graphql
bun add dataloader
bun add @graphql-tools/utils
bun add graphql-query-complexity
bun add @vendia/serverless-express
bun add -D @types/aws-lambda serverless serverless-esbuild serverless-offline
bun add -D @nestjs/cli@latest @nestjs/schematics@latest @nestjs/testing@latest ts-jest @types/express
```

## Verification
```bash
bun run build
```
