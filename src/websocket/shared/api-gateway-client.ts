/**
 * @file api-gateway-client.ts
 * @description API Gateway Management API client for sending WebSocket messages
 * @module websocket/shared
 */

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { removeConnection } from "./valkey-client";

/** Cached API Gateway Management API clients by endpoint */
const clientCache: Record<string, ApiGatewayManagementApiClient> = {};

/**
 * Gets or creates an API Gateway Management API client
 * @param domainName - The WebSocket API domain name
 * @param stage - The API Gateway stage
 * @returns API Gateway Management API client
 * @remarks Caches clients per endpoint to handle multiple API Gateways
 */
export const getApiGatewayClient = (
  domainName: string,
  stage: string
): ApiGatewayManagementApiClient => {
  const endpoint = `https://${domainName}/${stage}`;

  const existingClient = clientCache[endpoint];
  if (existingClient) {
    return existingClient;
  }

  const newClient = new ApiGatewayManagementApiClient({ endpoint });
  Object.assign(clientCache, { [endpoint]: newClient });

  return newClient;
};

/**
 * Sends a message to a WebSocket connection
 * @param connectionId - The API Gateway connectionId
 * @param domainName - The WebSocket API domain name
 * @param stage - The API Gateway stage
 * @param data - The data to send
 * @returns True if message was sent, false if connection is gone
 */
export const sendToConnection = async (
  connectionId: string,
  domainName: string,
  stage: string,
  data: unknown
): Promise<boolean> => {
  const client = getApiGatewayClient(domainName, stage);
  const payload = typeof data === "string" ? data : JSON.stringify(data);

  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(payload),
      })
    );
    return true;
  } catch (error) {
    if (error instanceof GoneException) {
      // Connection is stale - clean up
      console.log("Connection gone, cleaning up:", connectionId);
      await removeConnection(connectionId);
      return false;
    }
    throw error;
  }
};
