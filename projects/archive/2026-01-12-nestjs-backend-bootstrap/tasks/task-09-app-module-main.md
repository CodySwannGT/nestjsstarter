# Task 9: Create AppModule with GraphQL Configuration and Lambda Handler

## Objective
Create the root application module with GraphQL configuration and the Lambda handler entry point.

## Files to Create/Update

### 1. src/app.module.ts (Initial - without auth)
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
import { Request, Response } from "express";
import { HelloModule } from "./hello/hello.module";
import { DataLoaderModule } from "./data-loader/data-loader.module";
import { DataLoaderService } from "./data-loader/data-loader.service";

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

### 2. src/main.ts (Lambda Handler)
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

## Notes
- Initial app.module.ts does not include auth transformer (added in Task 12)
- Uses `functional/no-let` eslint-disable for Lambda caching pattern
- Schema file generated in src/ when running locally (IS_OFFLINE=true)

## Acceptance Criteria
- [ ] app.module.ts properly imports all modules
- [ ] GraphQL configured with Apollo driver
- [ ] DataLoaders injected into context
- [ ] Lambda handler caches NestJS app instance
- [ ] No TypeScript or linting errors

## Verification
```bash
bun run build
bun run lint src/app.module.ts src/main.ts
```
