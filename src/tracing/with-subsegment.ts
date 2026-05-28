/**
 * @file with-subsegment.ts
 * @description Utility function for creating X-Ray subsegments with proper error handling
 * @module tracing
 * @remarks
 * Use this utility when you need to trace custom operations that aren't
 * automatically instrumented (e.g., complex business logic, third-party SDK calls).
 * The function gracefully degrades when X-Ray context is unavailable, allowing
 * the wrapped function to execute normally without tracing.
 */
import { Logger } from "@nestjs/common";
import { getXRayNamespace, getXRaySegment } from "./xray.config";

const logger = new Logger("XRayTracing");

/**
 * Annotation value type for X-Ray subsegments.
 */
type AnnotationValue = string | number | boolean;

/**
 * X-Ray subsegment interface for type safety.
 * @remarks
 * This interface mirrors the aws-xray-sdk-core Subsegment type
 * to provide type safety without a hard dependency on the SDK.
 */
interface XRaySubsegment {
  addAnnotation(key: string, value: AnnotationValue): void;
  addMetadata(key: string, value: unknown): void;
  addError(error: Error): void;
  isClosed(): boolean;
  close(): void;
}

/**
 * X-Ray segment interface for type safety.
 */
interface XRaySegment {
  addNewSubsegment(name: string): XRaySubsegment;
}

/**
 * X-Ray namespace interface for async context propagation.
 */
interface XRayNamespace {
  runAndReturn<T>(fn: () => T): T;
}

/**
 * Options for subsegment creation.
 * @description
 * Provides configuration for X-Ray subsegment annotations and metadata.
 * Annotations are indexed and searchable in the X-Ray console, while
 * metadata stores debugging information that isn't searchable.
 * @remarks
 * - Annotations: Max 50 per trace, use for values you need to filter/search
 * - Metadata: No limit, use for debugging data you don't need to search
 */
export interface SubsegmentOptions {
  /**
   * Annotations are indexed and searchable in X-Ray console.
   * Use for values you want to filter/search by (userId, operationType, etc.).
   * Max 50 annotations per trace.
   */
  annotations?: Record<string, AnnotationValue>;

  /**
   * Metadata is not indexed but can store complex objects.
   * Use for debugging data you don't need to search (request bodies, responses).
   */
  metadata?: Record<string, unknown>;
}

/**
 * Safely add a single annotation to a subsegment.
 * @param subsegment - The X-Ray subsegment
 * @param key - The annotation key
 * @param value - The annotation value
 */
function addAnnotationSafely(
  subsegment: XRaySubsegment,
  key: string,
  value: AnnotationValue
): void {
  try {
    subsegment.addAnnotation(key, value);
  } catch {
    // Silently ignore annotation failures
  }
}

/**
 * Safely add annotations to a subsegment.
 * @param subsegment - The X-Ray subsegment
 * @param annotations - Record of annotations to add
 */
function addAnnotations(
  subsegment: XRaySubsegment,
  annotations: Record<string, AnnotationValue>
): void {
  Object.entries(annotations).forEach(([key, value]) => {
    addAnnotationSafely(subsegment, key, value);
  });
}

/**
 * Safely add metadata to a subsegment.
 * @param subsegment - The X-Ray subsegment
 * @param metadata - The metadata object to add
 */
function addMetadataSafely(
  subsegment: XRaySubsegment,
  metadata: Record<string, unknown>
): void {
  try {
    subsegment.addMetadata("details", metadata);
  } catch {
    // Silently ignore metadata failures
  }
}

/**
 * Safely record an error on a subsegment.
 * @param subsegment - The X-Ray subsegment
 * @param error - The error to record
 */
function recordErrorSafely(subsegment: XRaySubsegment, error: Error): void {
  try {
    subsegment.addError(error);
  } catch {
    // Silently ignore error recording failures
  }
}

/**
 * Safely close a subsegment.
 * @param subsegment - The X-Ray subsegment
 * @param name - The subsegment name (for logging)
 */
function closeSubsegmentSafely(subsegment: XRaySubsegment, name: string): void {
  try {
    if (!subsegment.isClosed()) {
      subsegment.close();
    }
  } catch (closeError) {
    const errorMessage =
      closeError instanceof Error ? closeError.message : "Unknown error";
    logger.warn(`Error closing subsegment "${name}": ${errorMessage}`);
  }
}

/**
 * Create a subsegment safely, returning null on failure.
 * @param segment - The parent X-Ray segment
 * @param name - The subsegment name
 * @returns The created subsegment or null if creation failed
 */
function createSubsegmentSafely(
  segment: XRaySegment,
  name: string
): XRaySubsegment | null {
  try {
    return segment.addNewSubsegment(name);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.warn(`Failed to create subsegment "${name}": ${errorMessage}`);
    return null;
  }
}

/**
 * Execute the traced operation with subsegment handling.
 * @param subsegment - The X-Ray subsegment
 * @param name - The subsegment name
 * @param fn - The async function to execute
 * @param options - Subsegment options
 * @returns The result of the async function
 */
async function executeWithSubsegment<T>(
  subsegment: XRaySubsegment,
  name: string,
  fn: () => Promise<T>,
  options: SubsegmentOptions
): Promise<T> {
  try {
    if (options.annotations) {
      addAnnotations(subsegment, options.annotations);
    }

    if (options.metadata) {
      addMetadataSafely(subsegment, options.metadata);
    }

    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      recordErrorSafely(subsegment, error);
    }
    throw error;
  } finally {
    closeSubsegmentSafely(subsegment, name);
  }
}

/**
 * Execute an async operation within an X-Ray subsegment.
 * @description
 * Wraps an async function with X-Ray tracing, automatically:
 * - Creating a subsegment with the given name
 * - Adding annotations and metadata
 * - Recording errors if the operation fails
 * - Closing the subsegment on completion
 *
 * If X-Ray is unavailable (local dev, missing context), the function
 * executes normally without tracing.
 * @param name - Subsegment name (e.g., "Cognito:GetUser", "Valkey:Get")
 * @param fn - Async function to execute within the subsegment
 * @param options - Optional annotations and metadata for the subsegment
 * @returns The result of the async function
 * @remarks
 * This utility uses `namespace.runAndReturn()` for proper async context
 * propagation across Promise chains. Errors are recorded on the subsegment
 * but are always re-thrown to preserve normal error handling flow.
 * @example
 * ```typescript
 * // Basic usage
 * const user = await withXRaySubsegment(
 *   "Cognito:GetUser",
 *   () => cognitoClient.getUser({ AccessToken: token })
 * );
 *
 * // With annotations for searchable metrics
 * const result = await withXRaySubsegment(
 *   "ProcessOrder",
 *   () => processOrder(orderId),
 *   { annotations: { orderId, customerId: "123" } }
 * );
 *
 * // With metadata for debugging
 * const response = await withXRaySubsegment(
 *   "ExternalAPI:Call",
 *   () => callExternalAPI(payload),
 *   { metadata: { requestPayload: payload } }
 * );
 * ```
 */
export async function withXRaySubsegment<T>(
  name: string,
  fn: () => Promise<T>,
  options: SubsegmentOptions = {}
): Promise<T> {
  const namespace = getXRayNamespace() as XRayNamespace | null;

  if (!namespace) {
    return fn();
  }

  return namespace.runAndReturn(async () => {
    const segment = getXRaySegment() as XRaySegment | null;

    if (!segment) {
      return fn();
    }

    const subsegment = createSubsegmentSafely(segment, name);

    if (!subsegment) {
      return fn();
    }

    return executeWithSubsegment(subsegment, name, fn, options);
  });
}
