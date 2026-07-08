/**
 * @file default.handler.ts
 * @description WebSocket $default route handler for GraphQL-WS protocol
 * @module websocket/handlers
 */

import { initializeXRay, withXRaySubsegment } from "../../tracing";
initializeXRay();

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { SubscriptionFilters } from "../../valkey/valkey.interface";
import { sendToConnection } from "../shared/api-gateway-client";
import {
  registerSubscription,
  unregisterSubscription,
} from "../shared/valkey-client";

/**
 * GraphQL-WS protocol message types
 * @see https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 */
type MessageType =
  | "connection_init"
  | "connection_ack"
  | "ping"
  | "pong"
  | "subscribe"
  | "next"
  | "error"
  | "complete";

/**
 * GraphQL-WS protocol message structure
 */
interface GraphQLWSMessage {
  id?: string;
  type: MessageType;
  payload?: {
    query?: string;
    variables?: Record<string, unknown>;
    operationName?: string;
    extensions?: Record<string, unknown>;
  };
}

/**
 * Extracts a string filter value from variables if present
 * @param variables - Query variables
 * @param key - The variable key to extract
 * @returns The string value or undefined
 */
const extractStringFilter = (
  variables: Record<string, unknown>,
  key: string
): string | undefined =>
  typeof variables[key] === "string" ? (variables[key] as string) : undefined;

/**
 * Extracts operation name and filters from a subscription query
 * @param query - The GraphQL subscription query
 * @param variables - Query variables
 * @returns Operation name and filter criteria
 */
const parseSubscriptionQuery = (
  query: string,
  variables: Record<string, unknown> = {}
): { operationName: string; filters: SubscriptionFilters } => {
  // Extract operation name from query using regex
  // Matches: subscription OnSomething or subscription onSomething
  const operationMatch = /subscription\s+(\w+)|subscription\s*\{/i.exec(query);
  const operationName = operationMatch?.[1] ?? "unknown";

  // Build filters from known variable names
  const resourceId = extractStringFilter(variables, "resourceId");
  const ownerId = extractStringFilter(variables, "ownerId");
  const organizationId = extractStringFilter(variables, "organizationId");

  const filters: SubscriptionFilters = {
    ...(resourceId ? { resourceId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(organizationId ? { organizationId } : {}),
  };

  return { operationName, filters };
};

/**
 * Safely parses JSON without throwing
 * @param json - JSON string to parse
 * @returns Parsed message or null if invalid
 */
const parseMessage = (json: string): GraphQLWSMessage | null => {
  try {
    return JSON.parse(json) as GraphQLWSMessage;
  } catch {
    return null;
  }
};

/**
 * Acknowledges a connection_init by sending connection_ack to the client
 * @param connectionId - WebSocket connection ID
 * @param domainName - API Gateway domain name
 * @param stage - API Gateway stage
 */
const handleConnectionInit = async (
  connectionId: string,
  domainName: string,
  stage: string
): Promise<void> => {
  await sendToConnection(connectionId, domainName, stage, {
    type: "connection_ack",
  });
};

/**
 * Responds to a ping message with a pong
 * @param connectionId - WebSocket connection ID
 * @param domainName - API Gateway domain name
 * @param stage - API Gateway stage
 */
const handlePing = async (
  connectionId: string,
  domainName: string,
  stage: string
): Promise<void> => {
  await sendToConnection(connectionId, domainName, stage, { type: "pong" });
};

/**
 * Registers a subscription in Valkey, returning an error result when the
 * message is missing required fields
 * @param connectionId - WebSocket connection ID
 * @param message - Parsed subscribe message
 * @returns Error result if validation fails, null on success
 */
const handleSubscribe = async (
  connectionId: string,
  message: GraphQLWSMessage
): Promise<APIGatewayProxyResult | null> => {
  if (!message.id || !message.payload?.query) {
    console.error("Subscribe message missing id or query");
    return { statusCode: 400, body: "Invalid subscribe message" };
  }
  const { operationName, filters } = parseSubscriptionQuery(
    message.payload.query,
    message.payload.variables
  );
  await registerSubscription(connectionId, message.id, operationName, filters);
  return null;
};

/**
 * Unregisters a subscription from Valkey, returning an error result when the
 * message is missing a required id
 * @param connectionId - WebSocket connection ID
 * @param message - Parsed complete message
 * @returns Error result if validation fails, null on success
 */
const handleComplete = async (
  connectionId: string,
  message: GraphQLWSMessage
): Promise<APIGatewayProxyResult | null> => {
  if (!message.id) {
    console.error("Complete message missing id");
    return { statusCode: 400, body: "Invalid complete message" };
  }
  await unregisterSubscription(connectionId, message.id);
  return null;
};

/**
 * Routes a GraphQL-WS protocol message to the appropriate handler based on type
 * @param connectionId - WebSocket connection ID
 * @param domainName - API Gateway domain name
 * @param stage - API Gateway stage
 * @param message - Parsed GraphQL-WS message
 * @returns Error result for invalid messages, null on success
 */
const dispatchMessage = async (
  connectionId: string,
  domainName: string,
  stage: string,
  message: GraphQLWSMessage
): Promise<APIGatewayProxyResult | null> => {
  switch (message.type) {
    case "connection_init":
      await handleConnectionInit(connectionId, domainName, stage);
      return null;
    case "ping":
      await handlePing(connectionId, domainName, stage);
      return null;
    case "subscribe":
      return handleSubscribe(connectionId, message);
    case "complete":
      return handleComplete(connectionId, message);
    default:
      console.log("Unhandled message type:", message.type);
      return null;
  }
};

/**
 * Handles a parsed GraphQL-WS message, wrapping dispatch in error handling
 * @param connectionId - WebSocket connection ID
 * @param domainName - API Gateway domain name
 * @param stage - API Gateway stage
 * @param message - Parsed GraphQL-WS message
 * @returns API Gateway response with status code
 */
const handleMessage = async (
  connectionId: string,
  domainName: string,
  stage: string,
  message: GraphQLWSMessage
): Promise<APIGatewayProxyResult> => {
  try {
    const result = await dispatchMessage(
      connectionId,
      domainName,
      stage,
      message
    );
    return result ?? { statusCode: 200, body: "" };
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
    return { statusCode: 500, body: "Internal error" };
  }
};

/**
 * Validates the request context and processes a WebSocket message, returning
 * early with an error response when required context fields are absent
 * @param connectionId - API Gateway connection ID (may be undefined)
 * @param domainName - API Gateway domain name (may be undefined)
 * @param stage - API Gateway deployment stage (may be undefined)
 * @param body - Raw message body from the Lambda event
 * @returns API Gateway response with status code
 */
const processWebSocketEvent = async (
  connectionId: string | undefined,
  domainName: string | undefined,
  stage: string | undefined,
  body: string | null | undefined
): Promise<APIGatewayProxyResult> => {
  if (!connectionId || !domainName || !stage) {
    console.error("Missing required request context fields");
    return { statusCode: 500, body: "Invalid request context" };
  }
  const message = parseMessage(body ?? "{}");
  if (!message) {
    console.error("Failed to parse message body");
    return { statusCode: 400, body: "Invalid JSON" };
  }
  console.log("WebSocket message:", {
    connectionId,
    type: message.type,
    id: message.id,
  });
  return handleMessage(connectionId, domainName, stage, message);
};

/**
 * Handles WebSocket messages using GraphQL-WS protocol
 * @param event - API Gateway proxy event with WebSocket message body
 * @returns API Gateway response with status code
 * @description Validates context, parses the incoming message, and delegates
 * to the message handler within an X-Ray tracing subsegment
 */
export const defaultHandler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const { connectionId, domainName, stage } = event.requestContext;
  return withXRaySubsegment(
    "WebSocket:Default",
    () => processWebSocketEvent(connectionId, domainName, stage, event.body),
    { annotations: { connectionId: connectionId ?? "unknown" } }
  );
};
