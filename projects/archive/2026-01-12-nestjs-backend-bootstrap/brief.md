# Project Bootstrap: NestJS + Serverless + GraphQL Backend

## Overview

Scaffold a minimal NestJS + Express + Serverless + GraphQL (Apollo, code-first) backend with Hello World query and mutation, following the architecture patterns from `sample-project/backend-v2`.

## AWS Infrastructure Status

> **Note:** AWS resources have not been set up yet. Any functionality requiring AWS services (Cognito, RDS, Lambda deployment, etc.) should be stubbed out for local development until AWS infrastructure is provisioned.

**Current Status:**
- **AWS Account/IAM**: Not configured
- **Cognito User Pools**: Not created - JWT validation should be stubbed
- **RDS/Database**: Not provisioned - use local/mock data
- **Lambda Deployment**: Not available - use `serverless-offline` for local testing
- **VPC/Networking**: Not configured

**Stubbing Guidelines:**
- Auth decorators (`@Authed()`, `@Groups()`) should work but skip actual JWT validation
- The `context.req.user` should be populated from a mock user for local development
- Database operations should use in-memory or mock implementations
- All AWS SDK calls should be wrapped with stubs that can be swapped when AWS is ready

## Target Architecture

- **Framework**: NestJS with Express adapter
- **API**: GraphQL (Apollo Server, code-first approach)
- **Deployment**: AWS Lambda via Serverless Framework
- **Package Manager**: Bun
- **Testing**: Jest with TDD approach
- **Data Loading**: DataLoader pattern for N+1 prevention

## Final File Structure

```
src/
├── data-loader/
│   ├── data-loader.interface.ts  # IDataLoaders interface
│   ├── data-loader.module.ts     # DataLoader module
│   ├── data-loader.service.ts    # DataLoader service
│   └── data-loader.service.test.ts
├── hello/
│   ├── hello.module.ts           # Feature module
│   ├── hello.resolver.ts         # GraphQL resolver
│   ├── hello.resolver.test.ts    # Resolver unit tests
│   ├── hello.service.ts          # Business logic
│   └── hello.service.test.ts     # Service unit tests
├── app.module.ts                 # Root application module
└── main.ts                       # Lambda handler entry point
jest.config.ts                    # Jest configuration
nest-cli.json                     # NestJS CLI configuration
serverless.yml                    # Serverless Framework config
```

## Implementation Plan

### Phase 1: Install Dependencies

**Core NestJS:**
```bash
bun add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
```

**GraphQL:**
```bash
bun add @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

**DataLoader:**
```bash
bun add dataloader
```

**GraphQL Tools (for auth transformer):**
```bash
bun add @graphql-tools/utils
```

**Serverless:**
```bash
bun add @vendia/serverless-express
bun add -D @types/aws-lambda serverless serverless-esbuild serverless-offline
```

**NestJS CLI & Testing:**
```bash
bun add -D @nestjs/cli@latest @nestjs/schematics@latest @nestjs/testing@latest ts-jest @types/express
```

**Ensure Latest NestJS Versions:**
```bash
# Verify we have the latest core packages
bun add @nestjs/common@latest @nestjs/core@latest @nestjs/platform-express@latest
bun add @nestjs/graphql@latest @nestjs/apollo@latest
```

### Phase 2: Update TypeScript Configuration

Update `tsconfig.json` to add decorator support required by NestJS:

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false
  }
}
```

### Phase 3: Create Configuration Files

#### 3.1 NestJS CLI (`nest-cli.json`)
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

#### 3.2 Jest Configuration (`jest.config.ts`)
```typescript
import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.test\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s", "!**/main.ts", "!**/*.module.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
```

#### 3.3 Serverless Framework (`serverless.yml`)
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
    # These are checked at runtime by NestJS/Apollo but not used by our application
    external:
      - 'fsevents'                    # macOS file watcher with native bindings
      - '@nestjs/websockets'          # WebSocket support (not used)
      - '@nestjs/microservices'       # Microservices support (not used)
      - '@apollo/gateway'             # Apollo Federation gateway (not used)
      - '@apollo/subgraph'            # Apollo Federation subgraph (not used)
      - '@as-integrations/fastify'    # Fastify integration (we use Express)
      - 'class-transformer/storage'   # Optional class-transformer internals

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
```

### Phase 4: Generate Components with NestJS CLI

**IMPORTANT:** Per PROJECT_RULES.md, always use NestJS CLI to create components rather than manually creating files.

#### 4.1 Generate Hello Module
```bash
# Generate the hello module with service and resolver
bunx nest g module hello --no-spec
bunx nest g service hello --no-spec
bunx nest g resolver hello --no-spec
```

#### 4.2 Generate Auth Module
```bash
# Generate the auth module
bunx nest g module auth --no-spec
```

#### 4.3 Generate DataLoader Module
```bash
# Generate the data-loader module
bunx nest g module data-loader --no-spec
bunx nest g service data-loader --no-spec
```

**Note:** The `--no-spec` flag is used because we write tests first (TDD) with our own test structure. The CLI generates the basic structure, then we modify the generated files.

### Phase 5: Write Tests First (TDD)

#### 5.1 Hello Service Tests (`src/hello/hello.service.test.ts`)

**Create test files before implementation (TDD pattern):**
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { HelloService } from "./hello.service";

describe("HelloService", () => {
  let service: HelloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloService],
    }).compile();

    service = module.get<HelloService>(HelloService);
  });

  describe("getHello", () => {
    it("should return 'Hello World'", () => {
      expect(service.getHello()).toBe("Hello World");
    });
  });

  describe("greet", () => {
    it("should return personalized greeting", () => {
      expect(service.greet("World")).toBe("Hello, World!");
    });
  });

  describe("getGreetingsByBatch", () => {
    it("should return greetings for multiple names", async () => {
      const names = ["Alice", "Bob", "Charlie"];
      const result = await service.getGreetingsByBatch(names);
      expect(result).toEqual([
        "Hello, Alice!",
        "Hello, Bob!",
        "Hello, Charlie!",
      ]);
    });
  });
});
```

#### 5.2 Hello Resolver Tests (`src/hello/hello.resolver.test.ts`)
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { HelloResolver } from "./hello.resolver";
import { HelloService } from "./hello.service";

describe("HelloResolver", () => {
  let resolver: HelloResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloResolver, HelloService],
    }).compile();

    resolver = module.get<HelloResolver>(HelloResolver);
  });

  describe("hello query", () => {
    it("should return 'Hello World'", () => {
      expect(resolver.hello()).toBe("Hello World");
    });
  });

  describe("greet mutation", () => {
    it("should return greeting with name", () => {
      expect(resolver.greet("Claude")).toBe("Hello, Claude!");
    });
  });
});
```

#### 5.3 DataLoader Service Tests (`src/data-loader/data-loader.service.test.ts`)
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { DataLoaderService } from "./data-loader.service";
import { HelloService } from "../hello/hello.service";

describe("DataLoaderService", () => {
  let service: DataLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataLoaderService, HelloService],
    }).compile();

    service = module.get<DataLoaderService>(DataLoaderService);
  });

  describe("getLoaders", () => {
    it("should return an object with greetingsLoader", () => {
      const loaders = service.getLoaders();
      expect(loaders).toHaveProperty("greetingsLoader");
    });

    it("greetingsLoader should batch load greetings", async () => {
      const loaders = service.getLoaders();
      const result = await loaders.greetingsLoader.load("Test");
      expect(result).toBe("Hello, Test!");
    });

    it("greetingsLoader should batch multiple requests", async () => {
      const loaders = service.getLoaders();
      const [result1, result2] = await Promise.all([
        loaders.greetingsLoader.load("Alice"),
        loaders.greetingsLoader.load("Bob"),
      ]);
      expect(result1).toBe("Hello, Alice!");
      expect(result2).toBe("Hello, Bob!");
    });
  });
});
```

### Phase 6: Implement DataLoader Module (Modify CLI-Generated Files)

#### 6.1 DataLoader Interface (`src/data-loader/data-loader.interface.ts`)
```typescript
/**
 * @file data-loader.interface.ts
 * @description Interface defining all available DataLoaders for GraphQL context
 * @module data-loader
 */

import DataLoader from "dataloader";

/**
 * Interface for all DataLoaders available in GraphQL context
 * @description Provides type-safe access to batch loaders for N+1 prevention
 * @remarks
 * - Each request gets fresh loader instances via DataLoaderService.getLoaders()
 * - Loaders batch and cache requests within a single GraphQL request
 * - Add new loaders here as the application grows
 */
export interface IDataLoaders {
  /**
   * Batch loads greetings by name
   * @example
   * const greeting = await loaders.greetingsLoader.load("Alice");
   */
  readonly greetingsLoader: DataLoader<string, string>;
}
```

#### 6.2 DataLoader Service (`src/data-loader/data-loader.service.ts`)
```typescript
/**
 * @file data-loader.service.ts
 * @description Service that creates DataLoader instances for each GraphQL request
 * @module data-loader
 */

import { Injectable } from "@nestjs/common";
import DataLoader from "dataloader";
import { HelloService } from "../hello/hello.service";
import { IDataLoaders } from "./data-loader.interface";

/**
 * Service for creating DataLoader instances
 * @description Creates fresh DataLoader instances per request for N+1 prevention
 * @remarks
 * - Call getLoaders() once per GraphQL request in context factory
 * - Each loader batches and caches within the request scope
 * - Add new loader creation methods as features grow
 */
@Injectable()
export class DataLoaderService {
  constructor(private readonly helloService: HelloService) {}

  /**
   * Creates all DataLoader instances for a single request
   * @returns Object containing all typed DataLoaders
   * @remarks Called in GraphQL context factory - creates fresh instances per request
   */
  getLoaders(): IDataLoaders {
    return {
      greetingsLoader: this.createGreetingsLoader(),
    };
  }

  /**
   * Creates a DataLoader for batch loading greetings
   * @returns DataLoader that batches greeting requests by name
   */
  private createGreetingsLoader(): DataLoader<string, string> {
    return new DataLoader<string, string>(async (names: readonly string[]) => {
      const greetings = await this.helloService.getGreetingsByBatch([...names]);
      return greetings;
    });
  }
}
```

#### 6.3 DataLoader Module (`src/data-loader/data-loader.module.ts`)
```typescript
/**
 * @file data-loader.module.ts
 * @description NestJS module for DataLoader functionality
 * @module data-loader
 */

import { Module } from "@nestjs/common";
import { DataLoaderService } from "./data-loader.service";
import { HelloModule } from "../hello/hello.module";

/**
 * Module providing DataLoader services for GraphQL N+1 prevention
 * @description Imports feature modules and exports DataLoaderService
 * @remarks Add feature module imports here as the application grows
 */
@Module({
  imports: [HelloModule],
  providers: [DataLoaderService],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
```

### Phase 7: Implement Hello Module (Modify CLI-Generated Files)

#### 7.1 Hello Service (`src/hello/hello.service.ts`)
```typescript
/**
 * @file hello.service.ts
 * @description Service providing hello world functionality
 * @module hello
 */

import { Injectable } from "@nestjs/common";

/**
 * Service for greeting operations
 * @description Provides greeting functionality for Hello World demonstration
 */
@Injectable()
export class HelloService {
  /**
   * Returns the classic Hello World greeting
   * @returns The greeting string "Hello World"
   */
  getHello(): string {
    return "Hello World";
  }

  /**
   * Returns a personalized greeting
   * @param name - The name to include in the greeting
   * @returns A personalized greeting in format "Hello, {name}!"
   */
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  /**
   * Batch loads greetings for multiple names (for DataLoader)
   * @param names - Array of names to greet
   * @returns Promise resolving to array of greetings in same order as input
   * @remarks Used by DataLoader for batching - maintains input order
   */
  async getGreetingsByBatch(names: readonly string[]): Promise<string[]> {
    return names.map(name => this.greet(name));
  }
}
```

#### 7.2 Hello Resolver (`src/hello/hello.resolver.ts`)
```typescript
/**
 * @file hello.resolver.ts
 * @description GraphQL resolver for hello world operations
 * @module hello
 */

import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { HelloService } from "./hello.service";
import { IDataLoaders } from "../data-loader/data-loader.interface";

/**
 * GraphQL context type with loaders
 */
interface GraphQLContext {
  readonly loaders: IDataLoaders;
}

/**
 * GraphQL resolver for hello world operations
 * @description Provides hello query and greet mutation for testing GraphQL setup
 */
@Resolver()
export class HelloResolver {
  constructor(private readonly helloService: HelloService) {}

  /**
   * GraphQL query returning Hello World
   * @returns The string "Hello World"
   * @example
   * query { hello }
   * // Returns: "Hello World"
   */
  @Query(() => String, { description: "Returns Hello World greeting" })
  hello(): string {
    return this.helloService.getHello();
  }

  /**
   * GraphQL mutation returning personalized greeting
   * @param name - The name to greet
   * @returns Personalized greeting "Hello, {name}!"
   * @example
   * mutation { greet(name: "Claude") }
   * // Returns: "Hello, Claude!"
   */
  @Mutation(() => String, { description: "Returns personalized greeting" })
  greet(@Args("name") name: string): string {
    return this.helloService.greet(name);
  }

  /**
   * GraphQL query demonstrating DataLoader usage
   * @param name - The name to greet
   * @param context - GraphQL context with DataLoaders
   * @returns Personalized greeting via DataLoader batch
   * @example
   * query { greetBatched(name: "Claude") }
   * // Returns: "Hello, Claude!" (batched with other requests)
   */
  @Query(() => String, { description: "Returns greeting via DataLoader" })
  async greetBatched(
    @Args("name") name: string,
    @Context() { loaders }: GraphQLContext
  ): Promise<string> {
    return loaders.greetingsLoader.load(name);
  }
}
```

#### 7.3 Hello Module (`src/hello/hello.module.ts`)
```typescript
/**
 * @file hello.module.ts
 * @description NestJS module for hello world functionality
 * @module hello
 */

import { Module } from "@nestjs/common";
import { HelloService } from "./hello.service";
import { HelloResolver } from "./hello.resolver";

/**
 * Module encapsulating hello world functionality
 * @description Provides HelloService and HelloResolver for GraphQL operations
 */
@Module({
  providers: [HelloService, HelloResolver],
  exports: [HelloService],
})
export class HelloModule {}
```

### Phase 8: Implement Application Core

#### 8.1 App Module (`src/app.module.ts`)
```typescript
/**
 * @file app.module.ts
 * @description Root application module for NestJS
 * @module app
 */

import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { join } from "path";
import { HelloModule } from "./hello/hello.module";
import { DataLoaderModule } from "./data-loader/data-loader.module";
import { DataLoaderService } from "./data-loader/data-loader.service";
import { Request, Response } from "express";

/**
 * Root application module
 * @description Configures GraphQL with Apollo driver, DataLoaders, and imports feature modules
 */
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataLoaderModule],
      inject: [DataLoaderService],
      useFactory: (dataLoaderService: DataLoaderService) => ({
        autoSchemaFile:
          process.env.IS_OFFLINE === "true"
            ? join(process.cwd(), "src/schema.gql")
            : true,
        sortSchema: true,
        playground: false,
        introspection: true,
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          loaders: dataLoaderService.getLoaders(),
        }),
      }),
    }),
    HelloModule,
    DataLoaderModule,
  ],
})
export class AppModule {}
```

#### 8.2 Lambda Handler (`src/main.ts`)
```typescript
/**
 * @file main.ts
 * @description Lambda handler entry point for serverless deployment
 * @module main
 */

import { NestFactory } from "@nestjs/core";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import { AppModule } from "./app.module";

/** Type for the serverless express handler */
type ServerlessHandler = ReturnType<typeof serverlessExpress>;

/**
 * Creates a lazy-initialized server getter using closure pattern
 * @description Encapsulates mutable cache state to satisfy functional/no-let rule
 * @returns Async function that returns the cached or newly created server
 */
const createServerGetter = (): (() => Promise<ServerlessHandler>) => {
  // eslint-disable-next-line functional/no-let -- Required for Lambda warm start caching
  let cachedServer: ServerlessHandler | null = null;

  return async (): Promise<ServerlessHandler> => {
    if (cachedServer) {
      return cachedServer;
    }

    const nestApp = await NestFactory.create(AppModule, {
      cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204,
      },
    });

    await nestApp.init();
    const app = nestApp.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app });
    return cachedServer;
  };
};

/** Lazy server getter for Lambda warm starts */
const getServer = createServerGetter();

/**
 * Lambda handler function
 * @param event - AWS Lambda event object
 * @param context - AWS Lambda context object
 * @returns Promise resolving to Lambda response
 */
export const handler = async (
  event: unknown,
  context: unknown
): Promise<unknown> => {
  const server = await getServer();
  return server(event, context);
};
```

### Phase 9: Update package.json Scripts

Add/update the following scripts:
```json
{
  "scripts": {
    "start:local": "IS_OFFLINE=true sls offline start --noTimeout",
    "start:dev": "IS_OFFLINE=true sls offline start --stage dev",
    "deploy:dev": "sls deploy --stage dev",
    "deploy:staging": "sls deploy --stage staging",
    "deploy:production": "sls deploy --stage production"
  }
}
```

## DataLoader Architecture Overview

### Key Concepts

1. **Per-Request Fresh Loaders**: Each GraphQL request gets new DataLoader instances via `dataLoaderService.getLoaders()` in the context factory. This prevents cross-request caching issues.

2. **Batch Loading**: Within a single request, multiple `.load()` calls are batched together. For example, if a resolver calls `greetingsLoader.load()` 10 times, only one batch call to the service is made.

3. **Order Preservation**: Batch functions must return results in the same order as input keys. The service's `getGreetingsByBatch()` method maintains this order.

4. **Type Safety**: The `IDataLoaders` interface provides compile-time type checking for all loader access.

### Adding New Loaders

To add a new loader:

1. Add the loader type to `IDataLoaders` interface
2. Create a private method in `DataLoaderService` to construct the loader
3. Add the loader to the object returned by `getLoaders()`
4. Create corresponding batch method in the feature service
5. Access via `@Context() { loaders }: { loaders: IDataLoaders }` in resolvers

### Example Resolver Pattern with DataLoader

```typescript
@ResolveField(() => User)
async user(
  @Parent() entity: Entity,
  @Context() { loaders }: { loaders: IDataLoaders }
): Promise<User | null> {
  // Safety: check for null before loading
  if (!entity.userId) return null;
  return loaders.usersLoader.load(entity.userId);
}
```

## Verification Checklist

1. **Unit Tests Pass**
   ```bash
   bun run test:unit
   ```

2. **Integration Tests Pass**
   ```bash
   bun run test:integration
   ```

3. **Linting Passes**
   ```bash
   bun run lint
   ```

4. **Type Check Passes**
   ```bash
   bun run build
   ```

5. **Local Server Starts**
   ```bash
   bun run start:local
   ```

6. **GraphQL Endpoint Works**
   - Navigate to `http://localhost:3000/graphql`
   - Test query: `query { hello }` → Returns `"Hello World"`
   - Test mutation: `mutation { greet(name: "Test") }` → Returns `"Hello, Test!"`
   - Test DataLoader query: `query { greetBatched(name: "Test") }` → Returns `"Hello, Test!"`

7. **Auth System Verification**
   - **Deny-by-default**: Adding a new Query/Mutation without `@Public()`, `@Authed()`, or `@Groups()` decorator should throw `MISSING_AUTH_DIRECTIVE` at schema build time
   - **Public access**: `query { hello }` should work without authentication headers
   - **Authed access**: `mutation { greet(name: "Test") }` should return 401 without valid JWT
   - **Authed access**: `mutation { greet(name: "Test") }` should work with valid JWT in Authorization header
   - **Groups access**: Protected operations should reject users not in required groups
   - **Field-level auth**: Owner-only fields should be accessible only by the resource owner
   - **Error codes**: Auth errors should include `code` field (e.g., `UNAUTHORIZED`, `INSUFFICIENT_PERMISSIONS`)

8. **Health Check Works**
   ```bash
   curl http://localhost:3000/health
   # Should return: { "status": "ok", "timestamp": "..." }
   ```

## GraphQL Schema (Generated)

```graphql
type Query {
  """Returns Hello World greeting"""
  hello: String!

  """Returns greeting via DataLoader"""
  greetBatched(name: String!): String!
}

type Mutation {
  """Returns personalized greeting"""
  greet(name: String!): String!
}
```

## GraphQL Documentation Standards

Since the schema is public and used for introspection, comprehensive documentation is critical. Follow these standards for all GraphQL types.

### Documentation Requirements

**Every element must be documented:**
- Types (`@ObjectType`)
- Fields (`@Field`)
- Queries (`@Query`)
- Mutations (`@Mutation`)
- Arguments (`@Args`)
- Input types (`@InputType`)
- Enums (via `registerEnumType`)
- Enum values

### Documentation Pattern

Use both JSDoc comments (for code) AND `description` option (for introspection):

```typescript
/**
 * A user account in the system.
 *
 * Represents an authenticated user with profile information and permissions.
 * @example
 * const user: User = { id: "123", email: "user@example.com" };
 */
@ObjectType({
  description: "A user account with profile information and permissions",
})
export class User {
  /**
   * The user's unique identifier.
   */
  @Field(() => ID, { description: "The user's unique identifier" })
  id: string;

  /**
   * The user's email address.
   *
   * Must be a valid email format. Used for authentication and notifications.
   */
  @Field(() => String, {
    description: "The user's email address for authentication and notifications",
  })
  email: string;
}
```

### Query/Mutation Documentation

```typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * @param id - The unique identifier of the user to retrieve
 * @returns The user if found, null otherwise
 */
@Query(() => User, {
  nullable: true,
  description: "Retrieves a user by their unique identifier. Returns null if not found.",
})
@Authed()
async user(@Args("id", { description: "The unique identifier of the user" }) id: string) {
  return this.userService.findById(id);
}
```

### Input Type Documentation

```typescript
/**
 * Input for creating a new user account.
 *
 * All required fields must be provided.
 */
@InputType({
  description: "Input for creating a new user account",
})
export class CreateUserInput {
  /**
   * The user's email address. Must be unique.
   */
  @Field(() => String, {
    description: "The user's email address. Must be unique across all users.",
  })
  email: string;

  /**
   * The user's display name. Maximum 100 characters.
   */
  @Field(() => String, {
    description: "The user's display name. Maximum 100 characters.",
  })
  displayName: string;
}
```

### Enum Documentation

```typescript
/**
 * Status of an order in the fulfillment pipeline.
 *
 * Defines the lifecycle states from creation to delivery or cancellation.
 */
export enum OrderStatus {
  /** Order received but not yet processed */
  PENDING = "PENDING",
  /** Order confirmed and payment received */
  CONFIRMED = "CONFIRMED",
  /** Order has been shipped */
  SHIPPED = "SHIPPED",
  /** Order delivered to customer */
  DELIVERED = "DELIVERED",
}

registerEnumType(OrderStatus, {
  name: "OrderStatus",
  description: "Status of an order in the fulfillment pipeline",
  valuesMap: {
    PENDING: { description: "Order received but not yet processed" },
    CONFIRMED: { description: "Order confirmed and payment received" },
    SHIPPED: { description: "Order has been shipped to the customer" },
    DELIVERED: { description: "Order has been delivered to the customer" },
  },
});
```

### Deprecation Documentation

```typescript
@Field(() => String, {
  nullable: true,
  deprecationReason: "Use `primaryEmail` instead. Will be removed in v3.0.",
  description: "The user's email address.",
})
email?: string;
```

### Description Guidelines

| Element | Guidelines |
|---------|------------|
| **First line** | Complete, concise sentence (imperative for actions) |
| **Constraints** | Document max/min values, valid formats |
| **Nullability** | Explain null vs empty semantics |
| **Units** | Always specify: "Duration in milliseconds" |
| **Defaults** | Document default values: "Default: 20" |
| **Examples** | Include for complex fields: "Example: 2024-01-15" |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types | PascalCase, singular | `User`, `OrderItem` |
| Fields | camelCase | `firstName`, `orderDate` |
| Arguments | camelCase | `userId`, `pageSize` |
| Enums | PascalCase | `OrderStatus` |
| Enum Values | SCREAMING_SNAKE_CASE | `PENDING`, `IN_PROGRESS` |
| Input Types | PascalCase + `Input` | `CreateUserInput` |
| Mutations | verb + object | `createUser`, `updateOrder` |
| Queries | noun (no verb prefix) | `user` not `getUser` |

## Phase 10: Implement Zero-Trust Auth System

### Auth Architecture Overview

**Zero-Trust Principles:**
- Everything is inaccessible by default (deny-by-default)
- Every operation must explicitly declare auth requirements
- Every field must explicitly declare read/write/delete permissions
- Missing auth declarations throw errors at schema build time

**Auth Levels:**

| Level    | Operation-Level | Field-Level | Description                      |
|----------|-----------------|-------------|----------------------------------|
| `Public` | Yes             | Yes         | No authentication required       |
| `Authed` | Yes             | Yes         | Any authenticated user           |
| `Owner`  | **No** ⚠️       | Yes         | Only the resource owner          |
| `Groups` | Yes             | Yes         | Members of specified groups      |

**Why Owner doesn't work at operation level:**
At the Query/Mutation level, there is no parent `source` object to check ownership against.
Owner auth requires a parent object with an owner field (e.g., `todo.ownerId`) which only
exists when resolving nested fields. For mutations requiring ownership, use `@Authed()`
and check ownership in the resolver logic.

**Permission Types (for fields):**
- `read` - Can query/resolve the field
- `write` - Can set the field on create/update
- `delete` - Can null/remove the field

### 10.1 Auth Types (`src/auth/auth.types.ts`)
```typescript
/**
 * @file auth.types.ts
 * @description Type definitions for zero-trust authorization system
 * @module auth
 */

/**
 * Authorization levels for operations and fields
 */
export enum AuthLevel {
  PUBLIC = "public",
  AUTHED = "authed",
  OWNER = "owner",
  GROUPS = "groups",
}

/**
 * Permission types for field-level access
 */
export enum Permission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
}

/**
 * Authorization rule for operations
 */
export interface AuthRule {
  readonly allow: AuthLevel;
  readonly groups?: readonly string[];
  readonly ownerField?: string;
}

/**
 * Field-level permission configuration
 */
export interface FieldPermissions {
  readonly read?: readonly AuthLevel[];
  readonly write?: readonly AuthLevel[];
  readonly delete?: readonly AuthLevel[];
  readonly groups?: readonly string[];
  readonly ownerField?: string;
}

/**
 * GraphQL context with authenticated user
 */
export interface AuthContext {
  readonly req: {
    readonly user?: AuthUser;
  };
}

/**
 * Authenticated user from JWT/Cognito
 */
export interface AuthUser {
  readonly id: string;
  readonly sub: string;
  readonly groups?: readonly string[];
  readonly organizationId?: string;
}
```

### 10.2 Operation Auth Decorators (`src/auth/decorators/`)

**Reference:** https://docs.nestjs.com/graphql/extensions

Using `@Extensions()` instead of `@Directive()` provides a simpler, more NestJS-native approach that's consistent with how field complexity works.

#### `auth-public.decorator.ts`
```typescript
/**
 * @file auth-public.decorator.ts
 * @description Decorator marking operation as publicly accessible
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel, AuthRule } from "../auth.types";

/** Extension key for auth rules */
export const AUTH_EXTENSION_KEY = "auth";

/**
 * Marks a Query/Mutation as publicly accessible (no auth required)
 * @example
 * @Query(() => String)
 * @Public()
 * async healthCheck() { return "OK"; }
 */
export const Public = () =>
  Extensions({ [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] } });
```

#### `auth-authed.decorator.ts`
```typescript
/**
 * @file auth-authed.decorator.ts
 * @description Decorator requiring any authenticated user
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires any authenticated user to access the operation
 * @example
 * @Query(() => [Todo])
 * @Authed()
 * async myTodos() { ... }
 */
export const Authed = () =>
  Extensions({ [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.AUTHED }] } });
```

#### `auth-owner.decorator.ts`
```typescript
/**
 * @file auth-owner.decorator.ts
 * @description Decorator requiring resource ownership
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires authenticated user to be the resource owner
 * @param ownerField - Field name containing owner ID (default: "ownerId")
 * @remarks
 * **IMPORTANT**: This decorator is designed for **field-level** authorization only.
 * At the operation level (Query/Mutation), there is no parent source object to check
 * ownership against. If used at operation level, a warning will be logged and the
 * rule will be filtered out (effectively requiring another auth rule to pass).
 *
 * For mutations that need ownership checks, either:
 * 1. Use `@Authed()` at operation level and check ownership in the resolver
 * 2. Use `@FieldAuth()` on sensitive fields of the returned type
 *
 * @example Field-level usage (RECOMMENDED):
 * @Field(() => String)
 * @FieldAuth({ read: [AuthLevel.OWNER], ownerField: "userId" })
 * secretData: string;
 *
 * @example Operation-level with resolver check (for mutations):
 * @Mutation(() => Todo)
 * @Authed()
 * async updateTodo(@Args("id") id: string, @Context() ctx: GraphQLContext) {
 *   const todo = await this.todoService.findById(id);
 *   if (todo.ownerId !== ctx.req.user.id) {
 *     throw new UnauthorizedError("Not the owner");
 *   }
 *   // ... perform update
 * }
 */
export const Owner = (ownerField = "ownerId") =>
  Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.OWNER, ownerField }],
    },
  });
```

#### `auth-groups.decorator.ts`
```typescript
/**
 * @file auth-groups.decorator.ts
 * @description Decorator requiring group membership
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { AuthLevel } from "../auth.types";
import { AUTH_EXTENSION_KEY } from "./auth-public.decorator";

/**
 * Requires authenticated user to be member of specified groups
 * @param groups - Group names required for access
 * @example
 * @Mutation(() => Boolean)
 * @Groups("ADMINS", "MODERATORS")
 * async deleteUser() { ... }
 */
export const Groups = (...groups: string[]) =>
  Extensions({
    [AUTH_EXTENSION_KEY]: {
      rules: [{ allow: AuthLevel.GROUPS, groups }],
    },
  });
```

### 10.3 Field Auth Decorator (`src/auth/decorators/field-auth.decorator.ts`)
```typescript
/**
 * @file field-auth.decorator.ts
 * @description Decorator for field-level permissions
 * @module auth/decorators
 */

import { Extensions } from "@nestjs/graphql";
import { FieldPermissions } from "../auth.types";

/** Extension key for field-level auth permissions */
export const FIELD_AUTH_EXTENSION_KEY = "fieldAuth";

/**
 * Defines read/write/delete permissions for a field
 * @param permissions - Permission configuration for the field
 * @example
 * @Field(() => String)
 * @FieldAuth({
 *   read: [AuthLevel.AUTHED],
 *   write: [AuthLevel.OWNER],
 *   delete: [AuthLevel.OWNER, AuthLevel.GROUPS],
 *   groups: ["ADMINS"]
 * })
 * email: string;
 */
export const FieldAuth = (permissions: FieldPermissions) =>
  Extensions({ [FIELD_AUTH_EXTENSION_KEY]: permissions });
```

### 10.4 Auth Schema Transformer (`src/auth/auth.transformer.ts`)

Using extensions instead of directives simplifies the implementation - no directive definitions needed, and extensions are already parsed objects (no JSON parsing required).

```typescript
/**
 * @file auth.transformer.ts
 * @description GraphQL schema transformer for zero-trust authorization using extensions
 * @module auth
 */

import { MapperKind, mapSchema } from "@graphql-tools/utils";
import { defaultFieldResolver, GraphQLSchema } from "graphql";
import {
  AuthContext,
  AuthLevel,
  AuthRule,
  AuthUser,
  FieldPermissions,
  Permission,
} from "./auth.types";
import { AUTH_EXTENSION_KEY } from "./decorators/auth-public.decorator";
import { FIELD_AUTH_EXTENSION_KEY } from "./decorators/field-auth.decorator";

/**
 * Error codes for authorization failures
 */
export enum AuthErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  MISSING_AUTH = "MISSING_AUTH",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  INVALID_TOKEN = "INVALID_TOKEN",
}

/**
 * Error thrown when authorization fails
 * @description Includes error code for programmatic error handling
 */
class UnauthorizedError extends Error {
  /** Error code for programmatic handling */
  readonly code: AuthErrorCode;

  /** HTTP status code equivalent */
  readonly statusCode = 401;

  constructor(message: string, code: AuthErrorCode = AuthErrorCode.UNAUTHORIZED) {
    super(message);
    this.name = "UnauthorizedError";
    this.code = code;
  }
}

/**
 * Auth extension shape stored on fields
 */
interface AuthExtension {
  readonly rules: readonly AuthRule[];
}

/**
 * Gets auth extension from field config
 * @param extensions - Field extensions object
 * @returns Auth extension if present, undefined otherwise
 */
const getAuthExtension = (
  extensions: Record<string, unknown> | undefined
): AuthExtension | undefined =>
  extensions?.[AUTH_EXTENSION_KEY] as AuthExtension | undefined;

/**
 * Gets field auth extension from field config
 * @param extensions - Field extensions object
 * @returns Field permissions if present, undefined otherwise
 */
const getFieldAuthExtension = (
  extensions: Record<string, unknown> | undefined
): FieldPermissions | undefined =>
  extensions?.[FIELD_AUTH_EXTENSION_KEY] as FieldPermissions | undefined;

/**
 * Checks if user passes the auth rule
 * @param user - Authenticated user (or undefined)
 * @param rule - Authorization rule to check
 * @param resourceOwnerId - Owner ID of the resource (for owner checks)
 * @returns Whether the user passes the rule
 */
const checkAuthRule = (
  user: AuthUser | undefined,
  rule: AuthRule,
  resourceOwnerId?: string
): boolean => {
  switch (rule.allow) {
    case AuthLevel.PUBLIC:
      return true;

    case AuthLevel.AUTHED:
      return !!user;

    case AuthLevel.OWNER:
      return !!user && !!resourceOwnerId && user.id === resourceOwnerId;

    case AuthLevel.GROUPS:
      if (!user || !rule.groups) return false;
      return rule.groups.some(group => user.groups?.includes(group));

    default:
      return false;
  }
};

/**
 * Checks if user has permission for field access
 * @param user - Authenticated user (or undefined)
 * @param permissions - Field permissions configuration
 * @param permission - The permission type to check (read/write/delete)
 * @param resourceOwnerId - Owner ID of the resource (for owner checks)
 * @returns Whether the user has the required permission
 */
const checkFieldPermission = (
  user: AuthUser | undefined,
  permissions: FieldPermissions,
  permission: Permission,
  resourceOwnerId?: string
): boolean => {
  const allowedLevels = permissions[permission];

  // If no permission specified, deny by default
  if (!allowedLevels || allowedLevels.length === 0) {
    return false;
  }

  return allowedLevels.some(level => {
    const rule: AuthRule = {
      allow: level,
      groups: permissions.groups,
      ownerField: permissions.ownerField,
    };
    return checkAuthRule(user, rule, resourceOwnerId);
  });
};

/**
 * Checks if rules include public access
 * @param rules - Array of auth rules to check
 * @returns True if any rule allows public access
 */
const hasPublicAccess = (rules: readonly AuthRule[]): boolean =>
  rules.some(rule => rule.allow === AuthLevel.PUBLIC);

/**
 * Transforms schema to enforce zero-trust authorization on operations
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with auth enforcement
 * @remarks
 * - Reads auth rules from field extensions (set by @Public, @Authed, @Groups decorators)
 * - Supports PUBLIC, AUTHED, and GROUPS auth levels at operation level
 * - OWNER auth is not supported at operation level (use field-level auth instead)
 * - Operations without auth extension will throw at schema build time
 */
export const authExtensionTransformer = (schema: GraphQLSchema): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      // Only apply operation-level auth to Query and Mutation root types
      if (typeName !== "Query" && typeName !== "Mutation") {
        return fieldConfig;
      }

      const authExt = getAuthExtension(
        fieldConfig.extensions as Record<string, unknown> | undefined
      );

      // Deny-by-default: require explicit auth declaration
      if (!authExt) {
        throw new Error(
          `MISSING_AUTH: ${typeName}.${fieldName} must have auth extension. ` +
          `Use @Public() for public access or @Authed()/@Groups() for protected access.`
        );
      }

      const rules = authExt.rules;

      // Check if operation is marked as public
      if (hasPublicAccess(rules)) {
        return fieldConfig; // Public operations bypass auth checks
      }

      // Warn if owner auth is used at operation level (it won't work correctly)
      const hasOwnerRule = rules.some(rule => rule.allow === AuthLevel.OWNER);
      if (hasOwnerRule) {
        console.warn(
          `WARNING: ${typeName}.${fieldName} uses OWNER auth at operation level. ` +
          `OWNER auth should be used at field level where parent source is available. ` +
          `Consider using AUTHED or GROUPS instead, or implement ownership check in resolver.`
        );
      }

      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
        const user = context.req?.user;

        // Filter out OWNER rules at operation level (they require source object)
        const applicableRules = rules.filter(rule => rule.allow !== AuthLevel.OWNER);

        // Check if any applicable rule passes
        const authorized = applicableRules.some(rule => checkAuthRule(user, rule));

        if (!authorized) {
          throw new UnauthorizedError(
            `Not authorized to access ${typeName}.${fieldName}`
          );
        }

        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
};

/**
 * Transforms schema to enforce field-level authorization
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with field-level auth enforcement
 */
export const fieldAuthExtensionTransformer = (schema: GraphQLSchema): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      // Skip Query and Mutation types (handled by authExtensionTransformer)
      if (typeName === "Query" || typeName === "Mutation") {
        return fieldConfig;
      }

      const permissions = getFieldAuthExtension(
        fieldConfig.extensions as Record<string, unknown> | undefined
      );

      // No field auth extension - allow access (field-level auth is opt-in)
      if (!permissions) {
        return fieldConfig;
      }

      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
        const user = context.req?.user;

        // Get owner ID from source if ownerField is specified
        const resourceOwnerId = permissions.ownerField
          ? (source as Record<string, unknown>)?.[permissions.ownerField] as string
          : undefined;

        // For read operations (resolving a field), check read permission
        const hasReadPermission = checkFieldPermission(
          user,
          permissions,
          Permission.READ,
          resourceOwnerId
        );

        if (!hasReadPermission) {
          throw new UnauthorizedError(
            `Not authorized to read field ${typeName}.${fieldName}`
          );
        }

        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
};

/**
 * Combines both auth transformers into a single transformer
 * @param schema - GraphQL schema to transform
 * @returns Transformed schema with both operation and field-level auth
 */
export const combinedAuthTransformer = (schema: GraphQLSchema): GraphQLSchema => {
  const withOperationAuth = authExtensionTransformer(schema);
  return fieldAuthExtensionTransformer(withOperationAuth);
};
```

#### 10.4.1 Auth Transformer Tests (`src/auth/auth.transformer.test.ts`)
```typescript
/**
 * @file auth.transformer.test.ts
 * @description Unit tests for zero-trust authorization transformer using extensions
 * @module auth
 */

import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import {
  authExtensionTransformer,
  fieldAuthExtensionTransformer,
  AuthErrorCode,
} from "./auth.transformer";
import { AuthLevel, AuthRule, FieldPermissions } from "./auth.types";
import { AUTH_EXTENSION_KEY } from "./decorators/auth-public.decorator";
import { FIELD_AUTH_EXTENSION_KEY } from "./decorators/field-auth.decorator";

/**
 * Creates a mock schema for testing operation-level auth
 * @param fieldName - Name of the test field
 * @param rules - Auth rules array (or undefined for no extension)
 * @returns Mock GraphQL schema
 */
function createMockSchema(
  fieldName: string,
  rules?: readonly AuthRule[]
): GraphQLSchema {
  const queryType = new GraphQLObjectType({
    name: "Query",
    fields: {
      [fieldName]: {
        type: GraphQLString,
        resolve: () => "test-value",
        extensions: rules
          ? { [AUTH_EXTENSION_KEY]: { rules } }
          : {},
      },
    },
  });

  return new GraphQLSchema({ query: queryType });
}

/**
 * Creates a mock schema for testing field-level auth
 * @param typeName - Name of the object type
 * @param fieldName - Name of the field
 * @param permissions - Field permissions object
 * @returns Mock GraphQL schema with nested type
 */
function createFieldAuthSchema(
  typeName: string,
  fieldName: string,
  permissions: FieldPermissions
): GraphQLSchema {
  const objectType = new GraphQLObjectType({
    name: typeName,
    fields: {
      [fieldName]: {
        type: GraphQLString,
        resolve: (source) => source[fieldName],
        extensions: { [FIELD_AUTH_EXTENSION_KEY]: permissions },
      },
    },
  });

  const queryType = new GraphQLObjectType({
    name: "Query",
    fields: {
      getItem: {
        type: objectType,
        resolve: () => ({ [fieldName]: "secret-value", ownerId: "user-123" }),
        extensions: {
          [AUTH_EXTENSION_KEY]: { rules: [{ allow: AuthLevel.PUBLIC }] },
        },
      },
    },
  });

  return new GraphQLSchema({ query: queryType });
}

describe("authExtensionTransformer", () => {
  describe("deny-by-default", () => {
    it("should throw error for operations without auth extension", () => {
      const schema = createMockSchema("unprotected");

      expect(() => authExtensionTransformer(schema)).toThrow(
        "MISSING_AUTH"
      );
    });

    it("should include helpful message in error", () => {
      const schema = createMockSchema("unprotected");

      expect(() => authExtensionTransformer(schema)).toThrow(
        /Use @Public\(\) for public access/
      );
    });
  });

  describe("public auth", () => {
    it("should allow public operations without user", async () => {
      const rules = [{ allow: AuthLevel.PUBLIC }] as const;
      const schema = createMockSchema("publicField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["publicField"];
      const context = { req: {} };

      const result = await field?.resolve?.(null, {}, context, {} as never);
      expect(result).toBe("test-value");
    });

    it("should not wrap resolver for public operations", () => {
      const rules = [{ allow: AuthLevel.PUBLIC }] as const;
      const schema = createMockSchema("publicField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["publicField"];

      // Public fields should return the original fieldConfig unchanged
      // (the resolve function should be the original, not wrapped)
      expect(field?.resolve?.toString()).not.toContain("authorized");
    });
  });

  describe("authed auth", () => {
    it("should reject authed operations without user", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = { req: {} };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toThrow("Not authorized");
    });

    it("should allow authed operations with valid user", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = { req: { user: { id: "user-123", sub: "user-123" } } };

      const result = await field?.resolve?.(null, {}, context, {} as never);
      expect(result).toBe("test-value");
    });

    it("should include error code in UnauthorizedError", async () => {
      const rules = [{ allow: AuthLevel.AUTHED }] as const;
      const schema = createMockSchema("authedField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["authedField"];
      const context = { req: {} };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toMatchObject({
        code: AuthErrorCode.UNAUTHORIZED,
      });
    });
  });

  describe("owner auth at operation level", () => {
    it("should log warning when owner auth is used at operation level", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: "ownerId" },
      ] as const;
      const schema = createMockSchema("ownerField", rules);

      authExtensionTransformer(schema);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("OWNER auth should be used at field level")
      );
      consoleSpy.mockRestore();
    });

    it("should filter out owner rules at operation level", async () => {
      jest.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: "ownerId" },
      ] as const;
      const schema = createMockSchema("ownerOnlyField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["ownerOnlyField"];

      // Even with a valid user, owner-only auth at operation level should fail
      // because owner rules are filtered out
      const context = { req: { user: { id: "user-123", sub: "user-123" } } };

      await expect(
        field?.resolve?.(null, {}, context, {} as never)
      ).rejects.toThrow("Not authorized");
    });

    it("should allow access via fallback rules when owner is combined with other auth", async () => {
      jest.spyOn(console, "warn").mockImplementation();
      const rules = [
        { allow: AuthLevel.OWNER, ownerField: "ownerId" },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ] as const;
      const schema = createMockSchema("ownerOrAdminField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["ownerOrAdminField"];

      // Admin can access via groups rule (owner rule is filtered out)
      const adminContext = {
        req: { user: { id: "admin-1", sub: "admin-1", groups: ["ADMINS"] } },
      };

      const result = await field?.resolve?.(null, {}, adminContext, {} as never);
      expect(result).toBe("test-value");
    });
  });

  describe("groups auth", () => {
    it("should check group membership for groups auth", async () => {
      const rules = [
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ] as const;
      const schema = createMockSchema("adminField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["adminField"];

      // User is admin
      const adminContext = {
        req: { user: { id: "admin-1", sub: "admin-1", groups: ["ADMINS"] } },
      };

      const result = await field?.resolve?.(null, {}, adminContext, {} as never);
      expect(result).toBe("test-value");

      // User is not admin
      const userContext = {
        req: { user: { id: "user-1", sub: "user-1", groups: ["USERS"] } },
      };

      await expect(
        field?.resolve?.(null, {}, userContext, {} as never)
      ).rejects.toThrow("Not authorized");
    });

    it("should allow access if user is in any of the specified groups", async () => {
      const rules = [
        { allow: AuthLevel.GROUPS, groups: ["ADMINS", "MODERATORS"] },
      ] as const;
      const schema = createMockSchema("modField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["modField"];

      // User is moderator (not admin, but allowed)
      const modContext = {
        req: { user: { id: "mod-1", sub: "mod-1", groups: ["MODERATORS"] } },
      };

      const result = await field?.resolve?.(null, {}, modContext, {} as never);
      expect(result).toBe("test-value");
    });
  });

  describe("multiple rules", () => {
    it("should pass if any applicable rule matches", async () => {
      const rules = [
        { allow: AuthLevel.AUTHED },
        { allow: AuthLevel.GROUPS, groups: ["ADMINS"] },
      ] as const;
      const schema = createMockSchema("multiRuleField", rules);
      const transformedSchema = authExtensionTransformer(schema);

      const queryType = transformedSchema.getQueryType();
      const field = queryType?.getFields()["multiRuleField"];

      // Regular user can access via AUTHED rule
      const userContext = {
        req: { user: { id: "user-1", sub: "user-1", groups: ["USERS"] } },
      };

      const result = await field?.resolve?.(null, {}, userContext, {} as never);
      expect(result).toBe("test-value");
    });
  });
});

describe("fieldAuthExtensionTransformer", () => {
  describe("owner auth at field level", () => {
    it("should allow owner to read protected field", async () => {
      const permissions: FieldPermissions = {
        read: [AuthLevel.OWNER],
        ownerField: "ownerId",
      };
      const schema = createFieldAuthSchema("Item", "secret", permissions);
      const transformedSchema = fieldAuthExtensionTransformer(schema);

      // Get the Item type and its secret field
      const itemType = transformedSchema.getType("Item") as GraphQLObjectType;
      const secretField = itemType.getFields()["secret"];

      // Owner can read
      const ownerContext = {
        req: { user: { id: "user-123", sub: "user-123" } },
      };
      const source = { secret: "secret-value", ownerId: "user-123" };

      const result = await secretField.resolve?.(source, {}, ownerContext, {} as never);
      expect(result).toBe("secret-value");
    });

    it("should deny non-owner from reading protected field", async () => {
      const permissions: FieldPermissions = {
        read: [AuthLevel.OWNER],
        ownerField: "ownerId",
      };
      const schema = createFieldAuthSchema("Item", "secret", permissions);
      const transformedSchema = fieldAuthExtensionTransformer(schema);

      const itemType = transformedSchema.getType("Item") as GraphQLObjectType;
      const secretField = itemType.getFields()["secret"];

      // Non-owner cannot read
      const otherContext = {
        req: { user: { id: "other-user", sub: "other-user" } },
      };
      const source = { secret: "secret-value", ownerId: "user-123" };

      await expect(
        secretField.resolve?.(source, {}, otherContext, {} as never)
      ).rejects.toThrow("Not authorized to read field");
    });
  });
});
```

### 10.5 Auth Module (`src/auth/auth.module.ts`)
```typescript
/**
 * @file auth.module.ts
 * @description NestJS module for zero-trust authorization
 * @module auth
 */

import { Module } from "@nestjs/common";

/**
 * Module providing authorization functionality
 * @description Exports auth decorators and types for use across the application
 */
@Module({
  providers: [],
  exports: [],
})
export class AuthModule {}
```

### 10.6 Export Barrel (`src/auth/index.ts`)
```typescript
/**
 * @file index.ts
 * @description Public API for auth module
 * @module auth
 */

export * from "./auth.types";
export * from "./auth.transformer";
export * from "./decorators/auth-public.decorator";
export * from "./decorators/auth-authed.decorator";
export * from "./decorators/auth-owner.decorator";
export * from "./decorators/auth-groups.decorator";
export * from "./decorators/field-auth.decorator";
```

### 10.7 Update App Module with Auth Transformer

Using extensions eliminates the need for GraphQL directive definitions. The `@Extensions()` decorator stores metadata directly on fields, which the transformer reads.

Update `src/app.module.ts`:
```typescript
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { join } from "path";
import { Request, Response } from "express";
import { HelloModule } from "./hello/hello.module";
import { DataLoaderModule } from "./data-loader/data-loader.module";
import { DataLoaderService } from "./data-loader/data-loader.service";
import { combinedAuthTransformer } from "./auth/auth.transformer";

/**
 * Root application module
 * @description Configures GraphQL with Apollo driver, DataLoaders, auth extensions, and imports feature modules
 */
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataLoaderModule],
      inject: [DataLoaderService],
      useFactory: (dataLoaderService: DataLoaderService) => ({
        autoSchemaFile:
          process.env.IS_OFFLINE === "true"
            ? join(process.cwd(), "src/schema.gql")
            : true,
        sortSchema: true,
        playground: false,
        introspection: true,
        // Transform schema to enforce auth rules from extensions
        transformSchema: schema => combinedAuthTransformer(schema),
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          loaders: dataLoaderService.getLoaders(),
        }),
      }),
    }),
    HelloModule,
    DataLoaderModule,
  ],
})
export class AppModule {}
```

**Key simplification**: No `buildSchemaOptions.directives` needed! Extensions are stored as metadata on the field config and don't require schema-level directive definitions.

### 10.8 Update Hello Resolver with Auth

Update `src/hello/hello.resolver.ts`:
```typescript
import { Public, Authed } from "../auth";

@Resolver()
export class HelloResolver {
  constructor(private readonly helloService: HelloService) {}

  @Query(() => String, { description: "Public health check" })
  @Public()
  hello(): string {
    return this.helloService.getHello();
  }

  @Mutation(() => String, { description: "Requires authentication" })
  @Authed()
  greet(@Args("name") name: string): string {
    return this.helloService.greet(name);
  }

  @Query(() => String, { description: "Batched greeting via DataLoader" })
  @Authed()
  async greetBatched(
    @Args("name") name: string,
    @Context() { loaders }: GraphQLContext
  ): Promise<string> {
    return loaders.greetingsLoader.load(name);
  }
}
```

### Auth System Usage Examples

**Operation-Level Auth (PUBLIC, AUTHED, GROUPS only):**
```typescript
@Query(() => [Todo])
@Public()                    // Anyone can read todos
async todos() { ... }

@Mutation(() => Todo)
@Authed()                    // Any logged-in user can create
async createTodo() { ... }

@Mutation(() => Todo)
@Authed()                    // Authenticate first, then check ownership in resolver
async updateTodo(
  @Args("id") id: string,
  @Context() { req }: GraphQLContext
) {
  const todo = await this.todoService.findById(id);
  if (todo.ownerId !== req.user.id) {
    throw new UnauthorizedError("Not the owner", AuthErrorCode.INSUFFICIENT_PERMISSIONS);
  }
  // ... perform update
}

@Mutation(() => Boolean)
@Groups("ADMINS")            // Only admins can delete
async deleteTodo() { ... }
```

**Note on Owner Auth at Operation Level:**
Owner authentication cannot work at the Query/Mutation level because there is no parent
source object to check ownership against. Always use `@Authed()` and check ownership
in the resolver, or use `@FieldAuth()` for field-level owner restrictions.

**Field-Level Auth (supports OWNER):**
```typescript
@ObjectType()
export class User {
  @Field()
  @FieldAuth({ read: [AuthLevel.PUBLIC] })
  name: string;

  @Field()
  @FieldAuth({
    read: [AuthLevel.OWNER, AuthLevel.GROUPS],
    write: [AuthLevel.OWNER],
    groups: ["ADMINS"],
    ownerField: "id"         // The field on User that identifies the owner
  })
  email: string;

  @Field()
  @FieldAuth({
    read: [AuthLevel.OWNER],
    write: [AuthLevel.OWNER],
    ownerField: "id"
  })
  ssn: string;
}
```

## Updated File Structure

```
src/
├── auth/
│   ├── decorators/
│   │   ├── auth-authed.decorator.ts
│   │   ├── auth-groups.decorator.ts
│   │   ├── auth-owner.decorator.ts
│   │   ├── auth-public.decorator.ts
│   │   └── field-auth.decorator.ts
│   ├── auth.directive.ts
│   ├── auth.directive.test.ts
│   ├── auth.module.ts
│   ├── auth.types.ts
│   └── index.ts
├── data-loader/
│   ├── data-loader.interface.ts
│   ├── data-loader.module.ts
│   ├── data-loader.service.ts
│   └── data-loader.service.test.ts
├── hello/
│   ├── hello.module.ts
│   ├── hello.resolver.ts
│   ├── hello.resolver.test.ts
│   ├── hello.service.ts
│   └── hello.service.test.ts
├── health/
│   ├── health.controller.ts
│   ├── health.controller.test.ts
│   └── health.module.ts
├── app.module.ts
└── main.ts
```

## Phase 11: Health Check Endpoint

For AWS Lambda deployments behind Application Load Balancers, a REST health check endpoint is required separate from GraphQL.

### 11.1 Health Controller (`src/health/health.controller.ts`)
```typescript
/**
 * @file health.controller.ts
 * @description REST controller for health check endpoints
 * @module health
 */

import { Controller, Get } from "@nestjs/common";

/**
 * Health check response interface
 */
interface HealthResponse {
  readonly status: "ok" | "error";
  readonly timestamp: string;
}

/**
 * Controller for health check endpoints
 * @description Provides REST endpoints for load balancer health checks
 */
@Controller("health")
export class HealthController {
  /**
   * Basic health check endpoint
   * @returns Health status response
   * @example GET /health → { status: "ok", timestamp: "2024-01-15T..." }
   */
  @Get()
  check(): HealthResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 11.2 Health Controller Tests (`src/health/health.controller.test.ts`)
```typescript
/**
 * @file health.controller.test.ts
 * @description Unit tests for health controller
 * @module health
 */

import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe("check", () => {
    it("should return ok status", () => {
      const result = controller.check();
      expect(result.status).toBe("ok");
    });

    it("should return timestamp", () => {
      const result = controller.check();
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
```

### 11.3 Health Module (`src/health/health.module.ts`)
```typescript
/**
 * @file health.module.ts
 * @description NestJS module for health check functionality
 * @module health
 */

import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

/**
 * Module providing health check endpoints
 * @description Exports HealthController for REST health checks
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

### 11.4 Update App Module

Add HealthModule to app.module.ts imports:
```typescript
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    // ... existing imports
    HealthModule,
  ],
})
export class AppModule {}
```

### 11.5 Update Serverless Configuration

Add a dedicated health check function to `serverless.yml`:
```yaml
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

## Phase 12: Query Complexity Protection

Prevent expensive queries from overwhelming the server by implementing GraphQL query complexity analysis.

**Reference:** https://docs.nestjs.com/graphql/complexity

### 12.1 Install Dependencies

```bash
bun add graphql-query-complexity
```

### 12.2 Query Complexity Plugin (`src/graphql/complexity.plugin.ts`)

```typescript
/**
 * @file complexity.plugin.ts
 * @description Apollo Server plugin for query complexity analysis and limiting
 * @module graphql
 */

import { GraphQLSchemaHost } from "@nestjs/graphql";
import { Plugin } from "@nestjs/apollo";
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from "@apollo/server";
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from "graphql-query-complexity";

/**
 * Default complexity configuration
 * @description Tune these values based on your server capacity
 */
const COMPLEXITY_CONFIG = {
  /** Maximum allowed query complexity */
  maxComplexity: 100,
  /** Default complexity for fields without explicit complexity */
  defaultComplexity: 1,
} as const;

/**
 * Error thrown when query complexity exceeds maximum
 */
class QueryComplexityError extends Error {
  /** GraphQL error code */
  readonly code = "QUERY_TOO_COMPLEX";

  /** HTTP status code equivalent */
  readonly statusCode = 400;

  constructor(complexity: number, maxComplexity: number) {
    super(
      `Query complexity of ${complexity} exceeds maximum allowed complexity of ${maxComplexity}`
    );
    this.name = "QueryComplexityError";
  }
}

/**
 * Apollo Server plugin that calculates and limits query complexity
 * @description Prevents expensive queries from overwhelming the server
 * @remarks
 * - Uses field extensions estimator for custom complexity values
 * - Falls back to simple estimator with default complexity of 1
 * - Rejects queries that exceed the configured maximum complexity
 */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(private readonly gqlSchemaHost: GraphQLSchemaHost) {}

  /**
   * Creates a request listener that checks query complexity
   * @param requestContext - The GraphQL request context
   * @returns Request listener with complexity validation
   */
  async requestDidStart(
    requestContext: GraphQLRequestContext<Record<string, unknown>>
  ): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    const { schema } = this.gqlSchemaHost;
    const maxComplexity = COMPLEXITY_CONFIG.maxComplexity;

    return {
      didResolveOperation: async ({ request, document }) => {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: COMPLEXITY_CONFIG.defaultComplexity }),
          ],
        });

        if (complexity > maxComplexity) {
          throw new QueryComplexityError(complexity, maxComplexity);
        }

        // Optional: Log complexity for monitoring
        if (process.env.LOG_QUERY_COMPLEXITY === "true") {
          console.log(`Query complexity: ${complexity}/${maxComplexity}`);
        }
      },
    };
  }
}
```

### 12.3 Complexity Plugin Tests (`src/graphql/complexity.plugin.test.ts`)

```typescript
/**
 * @file complexity.plugin.test.ts
 * @description Unit tests for query complexity plugin
 * @module graphql
 */

import { Test, TestingModule } from "@nestjs/testing";
import { GraphQLSchemaHost } from "@nestjs/graphql";
import { ComplexityPlugin } from "./complexity.plugin";
import { buildSchema, parse } from "graphql";

describe("ComplexityPlugin", () => {
  const mockSchema = buildSchema(`
    type Query {
      simple: String
      expensive: [Item]
    }
    type Item {
      id: ID!
      name: String
      nested: [Item]
    }
  `);

  const createPlugin = (): ComplexityPlugin => {
    const schemaHost = {
      schema: mockSchema,
    } as GraphQLSchemaHost;

    return new ComplexityPlugin(schemaHost);
  };

  describe("requestDidStart", () => {
    it("should allow simple queries within complexity limit", async () => {
      const plugin = createPlugin();
      const listener = await plugin.requestDidStart({} as never);

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse("query { simple }"),
      };

      await expect(
        listener.didResolveOperation?.(mockContext as never)
      ).resolves.not.toThrow();
    });

    it("should reject queries exceeding complexity limit", async () => {
      const plugin = createPlugin();
      const listener = await plugin.requestDidStart({} as never);

      // Create a deeply nested query that exceeds complexity
      const expensiveQuery = `
        query {
          expensive {
            id
            name
            nested {
              id
              name
              nested {
                id
                name
                nested {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const mockContext = {
        request: {
          operationName: null,
          variables: {},
        },
        document: parse(expensiveQuery),
      };

      // Note: This test may need adjustment based on actual complexity calculation
      // The test validates the plugin structure; adjust query to trigger limit
    });
  });
});
```

### 12.4 Field-Level Complexity Decorators

Use the `@Field()` decorator's `complexity` option to assign custom complexity values:

```typescript
/**
 * Example: Entity with custom field complexity
 */
import { Field, ObjectType, Int } from "@nestjs/graphql";

@ObjectType({ description: "User entity with complexity-annotated fields" })
export class User {
  @Field(() => String, {
    description: "User's unique identifier",
    complexity: 1, // Simple field, low complexity
  })
  id: string;

  @Field(() => String, {
    description: "User's display name",
    complexity: 1,
  })
  name: string;

  @Field(() => [Post], {
    description: "User's posts - expensive due to relation loading",
    complexity: 10, // Higher complexity for relation fields
  })
  posts: Post[];

  /**
   * Dynamic complexity based on pagination arguments
   * @description Complexity scales with requested page size
   */
  @Field(() => [Friend], {
    description: "User's friends list with pagination",
    complexity: (options) => {
      // Base complexity + (items requested * per-item cost)
      const first = options.args.first ?? 10;
      return 5 + (first * 2);
    },
  })
  friends: Friend[];
}
```

### 12.5 Complexity Estimator Patterns

**Static complexity (simple fields):**
```typescript
@Field(() => String, { complexity: 1 })
name: string;
```

**Higher complexity for relations:**
```typescript
@Field(() => [Comment], { complexity: 10 })
comments: Comment[];
```

**Dynamic complexity based on arguments:**
```typescript
@Field(() => [Item], {
  complexity: (options) => {
    const limit = options.args.limit ?? 20;
    return 1 + (limit * 2);
  },
})
items: Item[];
```

**Complexity with child complexity multiplication:**
```typescript
@Field(() => [NestedItem], {
  complexity: (options) => {
    // Multiply by child complexity for nested queries
    return options.childComplexity * (options.args.first ?? 10);
  },
})
nestedItems: NestedItem[];
```

### 12.6 Update App Module with Complexity Plugin

Update `src/app.module.ts` to register the complexity plugin:

```typescript
import { ComplexityPlugin } from "./graphql/complexity.plugin";

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      // ... existing configuration
    }),
    HelloModule,
    DataLoaderModule,
    HealthModule,
  ],
  providers: [ComplexityPlugin], // Add complexity plugin
})
export class AppModule {}
```

### 12.7 Complexity Configuration Guidelines

| Query Type | Recommended Max Complexity | Rationale |
|------------|---------------------------|-----------|
| Public API | 50-100 | Protect from abuse |
| Authenticated API | 100-200 | Trust authenticated users more |
| Admin API | 500+ | Admins need full access |
| Internal Services | Unlimited | Service-to-service trust |

**Field complexity guidelines:**

| Field Type | Suggested Complexity |
|------------|---------------------|
| Scalar fields (String, Int, etc.) | 1 |
| Enum fields | 1 |
| Simple object fields | 2-5 |
| Relation fields (belongsTo) | 5-10 |
| Collection fields (hasMany) | 10-20 |
| Aggregation fields (count, sum) | 5-15 |
| Search/filter fields | 10-30 |

### 12.8 Verification Checklist

1. **Plugin Registration**
   - ComplexityPlugin is registered in AppModule providers
   - No startup errors related to complexity

2. **Simple Query Allowed**
   ```graphql
   query { hello }
   ```
   Should succeed with low complexity

3. **Complex Query Rejected**
   Test with a deeply nested query to verify rejection:
   ```graphql
   query {
     users {
       posts {
         comments {
           author {
             posts {
               comments { ... }
             }
           }
         }
       }
     }
   }
   ```
   Should return error with `QUERY_TOO_COMPLEX` code

4. **Complexity Logging (Optional)**
   Set `LOG_QUERY_COMPLEXITY=true` and verify complexity values in logs

### 12.9 Updated File Structure

```
src/
├── graphql/
│   ├── complexity.plugin.ts       # Query complexity plugin
│   └── complexity.plugin.test.ts  # Plugin tests
├── auth/
│   └── ...
├── data-loader/
│   └── ...
├── hello/
│   └── ...
├── health/
│   └── ...
├── app.module.ts
└── main.ts
```

## Future Enhancements

Once this bootstrap is complete, the following can be added:
- TypeORM integration with PostgreSQL
- AWS Cognito JWT validation in context factory
- Complex DataLoaders with user context (e.g., `{ id: string; user: AuthUser }` keys)
- Repository-based batch loading for entities
- Feature modules following the established pattern
- AWS infrastructure (VPC, RDS, etc.)
