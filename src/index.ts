/**
 * Main entry point for the backend application
 * @module index
 */

// Re-export Lambda handler
export { handler } from "./main";

// Re-export AppModule for testing
export { AppModule } from "./app.module";

// Re-export auth types and decorators for consumers
export { AuthLevel, Public, Authed, Groups, Owner, FieldAuth } from "./auth";
export type { AuthRule, FieldPermissions } from "./auth";
