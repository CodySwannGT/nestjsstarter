/**
 * @file entity-mock.builder.ts
 * @description Generic base builder for constructing entity mocks in tests
 * @module test-utils
 * @remarks
 * The upstream version also shipped concrete builders for business entities.
 * Those are intentionally not ported — extend BaseEntityBuilder with
 * project-specific builders as entities are added.
 */

import { DeepPartial } from "typeorm";

/**
 * Base abstract class for all entity mock builders
 * @description Provides common functionality for building test entities with a fluent API
 * @example
 * class GreetingBuilder extends BaseEntityBuilder<Greeting> {
 *   constructor() {
 *     super({ id: "greeting-1", message: "Hello, World!" });
 *   }
 * }
 */
export abstract class BaseEntityBuilder<T extends object> {
  protected entity: T;

  constructor(defaults: T) {
    this.entity = { ...defaults };
  }

  /**
   * Override multiple properties at once
   * @param overrides - Partial entity properties to apply
   * @returns Builder instance for chaining
   */
  withOverrides(overrides: DeepPartial<T>): this {
    this.entity = { ...this.entity, ...overrides };
    return this;
  }

  /**
   * Build and return the entity
   * @returns A shallow copy of the built entity
   */
  build(): T {
    return { ...this.entity };
  }

  /**
   * Build and return multiple entities with optional overrides
   * @param count - Number of entities to build
   * @param overrideFn - Optional per-index override factory
   * @returns Array of built entities
   */
  buildMany(
    count: number,
    overrideFn?: (index: number) => DeepPartial<T>
  ): T[] {
    return Array.from({ length: count }, (_, index) => {
      const base = { ...this.entity };
      const overrides = overrideFn ? overrideFn(index) : {};
      return { ...base, ...overrides };
    });
  }
}
