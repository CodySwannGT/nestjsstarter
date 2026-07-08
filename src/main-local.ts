/**
 * @file main-local.ts
 * @description Local development entry point for Docker Compose environment
 * @module main-local
 */

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { applyGraphqlHardening } from "./graphql/graphql-hardening";

/**
 * Bootstraps the NestJS application for local development
 * @description Starts a standard HTTP server without Lambda wrapper, providing
 * a simpler development experience with built-in GraphQL subscription support
 * via graphql-ws protocol (configured in GraphQL module)
 * @remarks
 * - Uses NestFactory.create() instead of serverless-express for direct HTTP
 * - CORS is configured to allow all origins for local development convenience
 * - GraphQL subscriptions are handled by the GraphQL module's WebSocket upgrade
 * - X-Ray tracing is automatically disabled when IS_OFFLINE=true
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });

  const port = 3000;

  // Register the GraphQL hardening middleware (batched-POST operation cap)
  // BEFORE listen() (which triggers init()) so it runs ahead of Apollo in the
  // Express stack — keeping both entrypoints symmetrical.
  applyGraphqlHardening(app);

  await app.listen(port);

  console.log(`Server running at http://localhost:${port}`);
  console.log(`GraphQL Playground at http://localhost:${port}/graphql`);
}

bootstrap();
