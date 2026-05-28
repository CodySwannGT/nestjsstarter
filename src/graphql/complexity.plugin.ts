/**
 * @file complexity.plugin.ts
 * @description Apollo Server plugin for query complexity analysis and limiting
 * @module graphql
 */

import { Plugin } from "@nestjs/apollo";
import { ConfigService } from "@nestjs/config";
import { GraphQLSchemaHost } from "@nestjs/graphql";
import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from "@apollo/server";
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from "graphql-query-complexity";
import { Configuration } from "../config/configuration";

/**
 * Default complexity configuration
 * @description Tune these values based on your server capacity
 */
const COMPLEXITY_CONFIG = {
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
 * - Uses ConfigService for type-safe configuration
 */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(
    private readonly gqlSchemaHost: GraphQLSchemaHost,
    private readonly configService: ConfigService<Configuration, true>
  ) {}

  /**
   * Creates a request listener that checks query complexity
   * @param _requestContext - The GraphQL request context (unused)
   * @returns Request listener with complexity validation
   */
  async requestDidStart(
    _requestContext: GraphQLRequestContext<Record<string, unknown>>
  ): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    const { schema } = this.gqlSchemaHost;
    const maxComplexity = this.configService.get("graphql.maxComplexity", {
      infer: true,
    });
    const logComplexity = this.configService.get(
      "graphql.logQueryComplexity",
      { infer: true }
    );

    return {
      didResolveOperation: async ({ request, document }) => {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({
              defaultComplexity: COMPLEXITY_CONFIG.defaultComplexity,
            }),
          ],
        });

        if (complexity > maxComplexity) {
          throw new QueryComplexityError(complexity, maxComplexity);
        }

        // Optional: Log complexity for monitoring
        if (logComplexity) {
          console.log(`Query complexity: ${complexity}/${maxComplexity}`);
        }
      },
    };
  }
}
