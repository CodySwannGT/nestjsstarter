// CRITICAL: Initialize X-Ray FIRST, before any other imports that use HTTP
import { initializeXRay } from "./tracing";
initializeXRay();

/**
 * @file main.ts
 * @description Lambda handler entry point for serverless deployment
 * @module main
 */

import { NestFactory } from "@nestjs/core";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import type { Context, Callback } from "aws-lambda";
import { AppModule } from "./app.module";
import { applyGraphqlHardening } from "./graphql/graphql-hardening";

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

    // Register the GraphQL hardening middleware (batched-POST operation cap)
    // BEFORE init() so it runs ahead of Apollo in the Express stack.
    applyGraphqlHardening(nestApp);

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
 * @param callback - AWS Lambda callback (optional, unused with async handlers)
 * @returns Promise resolving to Lambda response
 */
export const handler = async (
  event: unknown,
  context: Context,
  callback: Callback
): Promise<unknown> => {
  const server = await getServer();
  return server(event, context, callback);
};
