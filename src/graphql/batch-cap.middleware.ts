/**
 * @file batch-cap.middleware.ts
 * @description Express middleware that caps the number of operations in a
 * batched GraphQL HTTP POST BEFORE Apollo parses, validates, or executes
 * anything. When `allowBatchedHttpRequests` is enabled, a client
 * `BatchHttpLink` can send an array-form POST body; the only bound then is the
 * client-side `batchMax`, which a hostile client controls. This is the
 * server-side enforcement.
 *
 * WHY middleware (not an Apollo plugin): mounting before Apollo guarantees
 * that an over-cap batch costs ZERO operation parses/validations/executions —
 * the request is rejected at the HTTP layer with a non-leaky 400. An Apollo
 * plugin would run only after the array had already been accepted into the
 * pipeline.
 *
 * Scope: HTTP POST batching only. WebSocket subscriptions send one operation
 * per message, so there is no HTTP-style array to cap over WS — this
 * middleware is HTTP-only by nature.
 * @module graphql
 */

import type { RequestHandler } from "express";
import { BATCH_TOO_LARGE } from "./graphql-limits.constants";

/**
 * Build the batch-cap middleware for a given cap.
 *
 * A factory (rather than a bare handler) so tests can mount it on a bare
 * Express app and so the cap is injected from configuration at the single
 * wiring site (graphql-hardening.ts).
 *
 * Behaviour:
 * - Array body with `length > cap` → HTTP 400 with a single non-leaky error
 *   object (`{ errors: [...] }`, no `data` key) and NO `next()` call, so Apollo
 *   never runs.
 * - Anything else (within-cap array, single non-array operation, or an
 *   unparsed/undefined body such as a GET landing-page request) → `next()`.
 *
 * CORS: Nest's `create({ cors })` middleware runs AFTER this short-circuit (it
 * is applied at `init()`, this is registered before `init()`), so the 400
 * would otherwise lack `Access-Control-Allow-Origin` and a browser would
 * surface a misleading CORS failure instead of the JSON error. We set the
 * header here with `setHeader` (idempotent — overwrites rather than appending,
 * so no duplication if CORS later runs on another path).
 * @param cap - Maximum operations allowed per batched POST.
 * @returns An Express `RequestHandler` enforcing the cap.
 */
export const createBatchCapMiddleware =
  (cap: number): RequestHandler =>
  (req, res, next) => {
    const { body } = req;
    if (Array.isArray(body) && body.length > cap) {
      // Mirror the entrypoints' NestFactory.create({ cors: { origin: "*" } }).
      // Nest's cors middleware runs at init() — AFTER this pre-init
      // short-circuit — so we must set ACAO ourselves or browsers mask the 400
      // as a CORS failure. KEEP IN LOCKSTEP with the entrypoints' cors.origin
      // if CORS is ever tightened.
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(400).json({
        errors: [
          {
            message: `Batched request exceeds the maximum of ${cap} operations per request.`,
            extensions: { code: BATCH_TOO_LARGE },
          },
        ],
      });
      return;
    }
    next();
  };
