/**
 * @file data-loader.interface.ts
 * @description Interface defining all available DataLoaders for GraphQL context
 * @module data-loader
 */

import DataLoader from "dataloader";

/**
 * Interface for all DataLoaders available in GraphQL context
 * @description Provides type-safe access to batch loaders for N+1 prevention
 * @remarks
 * - Each request gets fresh loader instances via DataLoaderService.getLoaders()
 * - Loaders batch and cache requests within a single GraphQL request
 * - Add new loaders here as the application grows
 */
export interface IDataLoaders {
  /**
   * Batch loads greetings by name
   * @example
   * const greeting = await loaders.greetingsLoader.load("Alice");
   */
  readonly greetingsLoader: DataLoader<string, string>;
}
