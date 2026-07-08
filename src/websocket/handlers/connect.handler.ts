/**
 * @file connect.handler.ts
 * @description WebSocket $connect route handler
 * @module websocket/handlers
 */

import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";
import { setConnection } from "../shared/valkey-client";

/**
 * Resolves user context and persists the WebSocket connection to Valkey.
 * @param event - API Gateway proxy event containing authorizer context
 * @param connectionId - The WebSocket connection ID
 * @returns API Gateway response indicating success or failure
 */
async function handleConnect(
  event: APIGatewayProxyEvent,
  connectionId: string
): Promise<APIGatewayProxyResult> {
  try {
    const authorizer = event.requestContext.authorizer ?? {};
    const userId = (authorizer.userId as string) ?? "anonymous";
    const groupsJson = (authorizer.groups as string) ?? "[]";
    const groups: readonly string[] = JSON.parse(groupsJson);

    console.log("WebSocket connect:", {
      connectionId,
      userId,
      groupCount: groups.length,
    });

    await setConnection(connectionId, {
      userId,
      groups,
      connectedAt: Date.now(),
    });

    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Failed to store connection:", error);
    return { statusCode: 500, body: "Connection failed" };
  }
}

/**
 * Handles WebSocket connection requests
 * @param event - API Gateway proxy event with connection context
 * @returns API Gateway response with status code
 * @description Stores connectionId and user context in Valkey when a client connects
 * @remarks
 * - Called by API Gateway when a WebSocket connection is established
 * - User context comes from the custom authorizer via requestContext.authorizer
 * - Returns 200 on success to allow the connection
 * - Returns 500 on failure to reject the connection
 */
export const connect: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    console.error("No connectionId in request context");
    return { statusCode: 500, body: "No connectionId" };
  }

  return withXRaySubsegment(
    "WebSocket:Connect",
    async () => handleConnect(event, connectionId),
    { annotations: { connectionId } }
  );
};
