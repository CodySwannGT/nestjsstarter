/**
 * @file dataloader.builder.ts
 * @description Builder for creating mock IDataLoaders instances in tests
 * @module test-utils
 */

import { IDataLoaders } from "../../data-loader/data-loader.interface";
import {
  createMockArrayDataLoader,
  createMockDataLoader,
  createMockPaginatedLoader,
} from "../factories/mock-dataloader.factory";

/**
 * Builder class for creating mock IDataLoaders instances
 * @description Provides a fluent API for setting up dataloaders with test data
 * @remarks Extend addAllStandardLoaders() as new loaders are added to IDataLoaders
 */
export class DataLoaderMockBuilder {
  private loaders: Partial<IDataLoaders> = {};

  /**
   * Add a standard dataloader mock
   * @param name - Name of the dataloader
   * @param defaultValue - Default value to return
   * @returns Builder instance for chaining
   */
  addLoader<K extends keyof IDataLoaders>(
    name: K,
    defaultValue?: unknown
  ): this {
    return this.setLoader(name, createMockDataLoader(defaultValue));
  }

  /**
   * Add an array dataloader mock
   * @param name - Name of the dataloader
   * @param defaultArray - Default array to return
   * @returns Builder instance for chaining
   */
  addArrayLoader<K extends keyof IDataLoaders>(
    name: K,
    defaultArray: unknown[] = []
  ): this {
    return this.setLoader(name, createMockArrayDataLoader(defaultArray));
  }

  /**
   * Add a paginated dataloader mock resolving relay-style connections
   * @param name - Name of the dataloader
   * @returns Builder instance for chaining
   */
  addPaginatedLoader<K extends keyof IDataLoaders>(name: K): this {
    return this.setLoader(name, createMockPaginatedLoader());
  }

  /**
   * Add a custom mock implementation for a specific loader
   * @param name - Name of the dataloader
   * @param implementation - Custom implementation
   * @returns Builder instance for chaining
   */
  addCustomLoader<K extends keyof IDataLoaders>(
    name: K,
    implementation: unknown
  ): this {
    return this.setLoader(name, implementation);
  }

  /**
   * Add all standard loaders with default empty/null values
   * @returns Builder instance for chaining
   * @remarks Register new loaders here as IDataLoaders grows
   */
  addAllStandardLoaders(): this {
    return this.addLoader("greetingsLoader");
  }

  /**
   * Build the final IDataLoaders mock object
   * @returns Complete IDataLoaders mock
   */
  build(): IDataLoaders {
    return this.loaders as IDataLoaders;
  }

  /**
   * Create a preset builder with all standard loaders mocked
   * @returns Builder preloaded with every loader in IDataLoaders
   */
  static createWithDefaults(): DataLoaderMockBuilder {
    return new DataLoaderMockBuilder().addAllStandardLoaders();
  }

  /**
   * Store a loader mock under the given name
   * @param name - Name of the dataloader
   * @param loader - Mock loader implementation
   * @returns Builder instance for chaining
   */
  private setLoader(name: keyof IDataLoaders, loader: unknown): this {
    // Mock loaders return generic types, so the cast through Partial is needed
    this.loaders = {
      ...this.loaders,
      [name]: loader,
    } as Partial<IDataLoaders>;
    return this;
  }
}

/**
 * Quick helper to create a fully mocked IDataLoaders instance
 * @returns IDataLoaders with all loaders mocked
 */
export function createMockDataLoaders(): IDataLoaders {
  return DataLoaderMockBuilder.createWithDefaults().build();
}
