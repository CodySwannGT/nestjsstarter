/**
 * @file operation-logging.plugin.ts
 * @description Apollo Server plugin for GraphQL operation X-Ray tracing
 * @module graphql
 *
 * @remarks
 * This plugin creates X-Ray subsegments for each GraphQL operation,
 * capturing operation name, type (query/mutation), duration, and errors.
 * It integrates with CloudWatch logging and AWS X-Ray for distributed tracing.
 */
import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from "@apollo/server";
import { Logger } from "@nestjs/common";
import { Plugin } from "@nestjs/apollo";
import { DocumentNode, OperationDefinitionNode } from "graphql";
import { getXRaySegment } from "../tracing";

/**
 * GraphQL request context with document and errors
 * @description Type-safe representation of the GraphQL request context
 * available in the willSendResponse hook
 */
interface RequestContext {
  /** The incoming request with optional operation name */
  request?: { operationName?: string };
  /** Array of errors that occurred during execution */
  errors?: readonly Error[];
  /** The parsed GraphQL document */
  document?: DocumentNode;
}

/**
 * X-Ray segment interface for type-safe subsegment operations
 * @description Minimal interface matching the X-Ray SDK segment API
 * for the operations used by this plugin
 */
interface XRaySegment {
  /** Create a new subsegment with the given name */
  addNewSubsegment(name: string): XRaySubsegment;
}

/**
 * X-Ray subsegment interface for type-safe annotation and metadata operations
 * @description Minimal interface matching the X-Ray SDK subsegment API
 */
interface XRaySubsegment {
  /** Add a filterable annotation to the subsegment */
  addAnnotation(key: string, value: string | number | boolean): void;
  /** Add structured metadata to the subsegment */
  addMetadata(namespace: string, data: Record<string, unknown>): void;
  /** Record an error on the subsegment */
  addError(error: Error): void;
  /** Check if the subsegment has been closed */
  isClosed(): boolean;
  /** Close the subsegment */
  close(): void;
}

/**
 * Apollo Server plugin that traces GraphQL operations with AWS X-Ray
 *
 * @description
 * For each GraphQL request, this plugin:
 * - Creates a subsegment named "GraphQL:{operationName}"
 * - Records operation duration
 * - Captures any errors that occur
 * - Adds annotations for filtering in X-Ray console
 * - Logs operation details to CloudWatch via NestJS Logger
 *
 * @remarks
 * - Gracefully degrades when X-Ray context is unavailable
 * - Uses NestJS Logger for CloudWatch integration
 * - Closes subsegments in a finally block to prevent leaks
 */
@Plugin()
export class OperationLoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger("GraphQL");

  /**
   * Called at the start of each GraphQL request
   * @param _requestContext - The GraphQL request context (unused)
   * @description Creates timing context and returns listener for response phase
   * @returns GraphQL request listener with willSendResponse hook
   */
  async requestDidStart(
    _requestContext: GraphQLRequestContext<Record<string, unknown>>
  ): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    const startTime = Date.now();

    return {
      /**
       * Called just before the response is sent
       * @description Records operation timing, logs to CloudWatch, and adds X-Ray tracing
       */
      willSendResponse: async ({
        request,
        errors,
        document,
      }: RequestContext): Promise<void> => {
        const duration = Date.now() - startTime;
        const operationDef = this.findOperationDefinition(document);
        const operationName = this.extractOperationName(request, operationDef);
        const operationType = this.extractOperationType(operationDef);
        const hasErrors = Boolean(errors?.length);

        this.logOperation(operationType, operationName, duration, hasErrors, errors);

        this.addXRayAnnotations(
          operationName,
          operationType,
          duration,
          hasErrors,
          errors
        );
      },
    };
  }

  /**
   * Log operation details to CloudWatch via NestJS Logger
   * @param operationType - The GraphQL operation type (query/mutation/subscription)
   * @param operationName - The operation name or "anonymous"
   * @param duration - Operation duration in milliseconds
   * @param hasErrors - Whether any errors occurred
   * @param errors - Array of errors if any occurred
   */
  private logOperation(
    operationType: string,
    operationName: string,
    duration: number,
    hasErrors: boolean,
    errors?: readonly Error[]
  ): void {
    if (hasErrors) {
      this.logger.error(
        `${operationType}:${operationName} failed in ${duration}ms`
      );
      errors?.forEach(error => {
        this.logger.error(`Error: ${error.message}`);
      });
    } else {
      this.logger.log(
        `${operationType}:${operationName} completed in ${duration}ms`
      );
    }
  }

  /**
   * Find the first operation definition in a GraphQL document
   * @param document - The parsed GraphQL document
   * @returns The first operation definition, or undefined if none found
   */
  private findOperationDefinition(
    document?: DocumentNode
  ): OperationDefinitionNode | undefined {
    return document?.definitions.find(
      (def): def is OperationDefinitionNode =>
        def.kind === "OperationDefinition"
    );
  }

  /**
   * Extract operation name from request or document
   * @param request - The GraphQL request object with optional operationName
   * @param operationDef - The operation definition from the document
   * @returns The operation name, or "anonymous" if none is found
   * @remarks Prefers request.operationName over document-defined name
   */
  private extractOperationName(
    request?: { operationName?: string },
    operationDef?: OperationDefinitionNode
  ): string {
    return request?.operationName ?? operationDef?.name?.value ?? "anonymous";
  }

  /**
   * Extract operation type from operation definition
   * @param operationDef - The operation definition from the document
   * @returns The operation type (query/mutation/subscription), or "unknown" if not found
   */
  private extractOperationType(operationDef?: OperationDefinitionNode): string {
    return operationDef?.operation ?? "unknown";
  }

  /**
   * Add X-Ray annotations for the GraphQL operation
   * @param operationName - The GraphQL operation name
   * @param operationType - The operation type (query/mutation/subscription)
   * @param duration - Operation duration in milliseconds
   * @param hasErrors - Whether errors occurred during execution
   * @param errors - Array of errors to record, if any
   * @remarks Gracefully handles missing X-Ray context by returning early
   */
  private addXRayAnnotations(
    operationName: string,
    operationType: string,
    duration: number,
    hasErrors: boolean,
    errors?: readonly Error[]
  ): void {
    try {
      const segment = getXRaySegment() as XRaySegment | null;
      if (!segment) return;

      const subsegment = segment.addNewSubsegment(`GraphQL:${operationName}`);

      try {
        subsegment.addAnnotation("graphql.operation", operationName);
        subsegment.addAnnotation("graphql.type", operationType);
        subsegment.addAnnotation("graphql.duration_ms", duration);
        subsegment.addAnnotation("graphql.has_errors", hasErrors);

        subsegment.addMetadata("graphql", {
          operationName,
          operationType,
          durationMs: duration,
          hasErrors,
        });

        if (hasErrors && errors) {
          errors.forEach(error => {
            subsegment.addError(error);
          });
        }
      } finally {
        if (!subsegment.isClosed()) {
          subsegment.close();
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to add X-Ray annotations: ${errorMessage}`);
    }
  }
}
