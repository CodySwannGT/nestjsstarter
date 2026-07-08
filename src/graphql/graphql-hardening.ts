/**
 * @file graphql-hardening.ts
 * @description Single wiring site for the HTTP-layer GraphQL hardening
 * middleware (the batched-POST operation cap). Called by BOTH entrypoints —
 * `main.ts` (Lambda) and `main-local.ts` (local HTTP) — after
 * `NestFactory.create()` and BEFORE `init()`/`listen()`, so the middleware is
 * registered ahead of Apollo in the Express stack.
 * @module graphql
 */

import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json } from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { Configuration } from "../config/configuration";
import { createBatchCapMiddleware } from "./batch-cap.middleware";

/**
 * Register the GraphQL hardening middleware on the app's Express instance.
 *
 * Ordering is load-bearing: the Express instance is grabbed pre-init and the
 * middleware registered first, so an over-cap batch is rejected at the HTTP
 * layer with a non-leaky 400 — zero operations parse/validate/execute. We parse
 * the JSON body ourselves (`express.json`) because nothing has parsed it this
 * early; Apollo's later parser sees `req._body` and reuses it, so the double
 * parse is a no-op. `limit: "100kb"` is pinned explicitly: it is the de-facto
 * bound on both single-body and batch-array request size, so a future global
 * body-parser change can't silently widen the DoS surface. (body-parser's
 * implicit default is also 100kb today; making it explicit makes it
 * load-bearing.)
 *
 * The /graphql JSON parser MUST be wrapped in a differently-named function.
 * NestJS's `ExpressAdapter.registerParserMiddleware()` (called during
 * `app.init()`) decides whether to install the GLOBAL body parser by scanning
 * the whole router stack for a middleware whose function name is "jsonParser"
 * — ignoring mount path. body-parser's `express.json()` returns a function
 * literally named "jsonParser", so registering it here (even scoped to
 * /graphql) would make Nest believe a global parser already exists and skip
 * its own — leaving every non-/graphql route (REST controllers, webhooks) with
 * an UNPARSED body. The arrow wrapper has a distinct name, so Nest still
 * installs the global parser for all other routes while /graphql keeps its
 * early parse (Apollo reuses `req._body`, so the subsequent global parse on
 * /graphql is a no-op).
 * @param app - The Nest application returned by `NestFactory.create()`, not yet initialized.
 */
export const applyGraphqlHardening = (app: INestApplication): void => {
  const configService =
    app.get<ConfigService<Configuration, true>>(ConfigService);
  const maxBatchOperations = configService.get("graphql.maxBatchOperations", {
    infer: true,
  });

  const expressApp: Express = app.getHttpAdapter().getInstance();
  const graphqlJsonParser = json({ limit: "100kb" });
  expressApp.use(
    "/graphql",
    (req: Request, res: Response, next: NextFunction) =>
      graphqlJsonParser(req, res, next),
    createBatchCapMiddleware(maxBatchOperations)
  );
};
