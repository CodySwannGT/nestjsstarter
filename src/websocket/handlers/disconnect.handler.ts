/**
 * @file disconnect.handler.ts
 * @description WebSocket $disconnect route handler
 * @module websocket/handlers
 */

import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { removeConnection } from "../shared/valkey-client";

/**
 * Handles WebSocket disconnection requests
 * @param event - API Gateway proxy event with connection context
 * @returns API Gateway response with status code
 * @description Removes connectionId and associated subscriptions from Valkey
 * @remarks
 * - Called by API Gateway when a WebSocket connection is closed
 * - Cleans up both connection data and subscription registrations
 * - Returns 200 even if connection not found (idempotent)
 * - Errors are logged but do not affect the response
 */
export const disconnect: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;

  return withXRaySubsegment(
    "WebSocket:Disconnect",
    async () => {
      if (!connectionId) {
        console.error("No connectionId in request context");
        return { statusCode: 200, body: "Disconnected" };
      }

      try {
        console.log("WebSocket disconnect:", connectionId);

        // Remove connection and all associated subscriptions from Valkey
        await removeConnection(connectionId);

        return { statusCode: 200, body: "Disconnected" };
      } catch (error) {
        // Log error but return success - connection is gone regardless
        console.error("Error during disconnect cleanup:", error);
        return { statusCode: 200, body: "Disconnected" };
      }
    },
    {
      annotations: {
        connectionId: connectionId ?? "unknown",
      },
    }
  );
};
