/**
 * @file index.ts
 * @description Barrel export for tracing utilities providing X-Ray instrumentation
 * @module tracing
 * @remarks
 * This module consolidates all X-Ray tracing utilities for clean imports.
 * Import from this module rather than individual files to maintain
 * consistent API usage across the codebase.
 */

export {
  initializeXRay,
  getXRaySegment,
  getXRayNamespace,
} from "./xray.config";
export { withXRaySubsegment } from "./with-subsegment";
export type { SubsegmentOptions } from "./with-subsegment";
