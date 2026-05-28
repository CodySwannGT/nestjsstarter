# Task 4: Create Serverless Framework Configuration

## Objective
Create serverless.yml configuration for AWS Lambda deployment with ESBuild bundling.

## File to Create

### serverless.yml
```yaml
service: thumbwar-backend
frameworkVersion: "^4.0.0"

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    keepNames: true
    platform: node
    target: node20
    resolveExtensions:
      - '.ts'
      - '.js'
      - '.mjs'
    exclude:
      - '@aws-sdk/*'
      - 'aws-sdk'
    # Mark optional peer dependencies as external to prevent bundling errors
    external:
      - 'fsevents'
      - '@nestjs/websockets'
      - '@nestjs/microservices'
      - '@apollo/gateway'
      - '@apollo/subgraph'
      - '@as-integrations/fastify'
      - 'class-transformer/storage'

plugins:
  - serverless-esbuild
  - serverless-offline

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  httpApi:
    cors: true

build:
  esbuild: false

package:
  patterns:
    - '!src/**/*.spec.ts'
    - '!src/**/*.test.ts'
    - '!src/**/*.d.ts'
    - '!**/*.js.map'

functions:
  main:
    handler: src/main.handler
    timeout: 29
    memorySize: 1024
    events:
      - httpApi:
          method: any
          path: /{proxy+}
      - httpApi:
          method: GET
          path: /health
```

## Key Configuration Points
- ESBuild for fast bundling
- External packages to prevent bundling errors
- HTTP API (API Gateway v2) for better performance
- serverless-offline for local development

## Acceptance Criteria
- [ ] serverless.yml created at project root
- [ ] No YAML syntax errors
- [ ] serverless-offline can start (after main.ts is created)

## Verification
After all modules are created:
```bash
bun run start:local
```
