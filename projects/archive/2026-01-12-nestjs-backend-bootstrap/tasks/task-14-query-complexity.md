# Task 14: Implement Query Complexity Plugin with Tests (TDD)

## Objective
Implement GraphQL query complexity analysis and limiting.

## Step 1: Write Tests First

### src/graphql/complexity.plugin.test.ts
```typescript
/**
 * @file complexity.plugin.test.ts
 * @description Unit tests for query complexity plugin
 * @module graphql
 */

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

    it("should return listener with didResolveOperation", async () => {
      const plugin = createPlugin();
      const listener = await plugin.requestDidStart({} as never);

      expect(listener).toHaveProperty("didResolveOperation");
      expect(typeof listener.didResolveOperation).toBe("function");
    });
  });
});
```

## Step 2: Run Tests (Should Fail)
```bash
bun run test:unit src/graphql/complexity.plugin.test.ts
```

## Step 3: Implement Plugin

### src/graphql/complexity.plugin.ts
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
   * @param _requestContext - The GraphQL request context (unused)
   * @returns Request listener with complexity validation
   */
  async requestDidStart(
    _requestContext: GraphQLRequestContext<Record<string, unknown>>
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

## Step 4: Run Tests (Should Pass)
```bash
bun run test:unit src/graphql/complexity.plugin.test.ts
```

## Step 5: Update AppModule
Add ComplexityPlugin to providers:

```typescript
import { ComplexityPlugin } from "./graphql/complexity.plugin";

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [ComplexityPlugin],
})
export class AppModule {}
```

## Acceptance Criteria
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] Plugin registered in AppModule
- [ ] QueryComplexityError includes error code
- [ ] JSDoc documentation
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/graphql/
bun run lint src/graphql/
```
