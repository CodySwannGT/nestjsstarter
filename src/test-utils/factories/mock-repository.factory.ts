/**
 * @file mock-repository.factory.ts
 * @description Factories for creating mock TypeORM repositories and query builders
 * @module test-utils
 */

import { vi } from "vitest";
import type { Mock, Mocked } from "vitest";
import type {
  EntityMetadata,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

/**
 * Query builder methods that return the builder itself for chaining
 */
const CHAINABLE_QUERY_BUILDER_METHODS = [
  "select",
  "addSelect",
  "leftJoin",
  "leftJoinAndSelect",
  "innerJoin",
  "innerJoinAndSelect",
  "where",
  "andWhere",
  "orWhere",
  "orderBy",
  "addOrderBy",
  "groupBy",
  "addGroupBy",
  "having",
  "limit",
  "offset",
  "skip",
  "take",
  "setParameter",
  "setParameters",
  "useIndex",
  "cache",
  "clone",
] as const;

/**
 * Query builder methods that execute the query and return results
 */
const EXECUTION_QUERY_BUILDER_METHODS = [
  "getMany",
  "getOne",
  "getManyAndCount",
  "getCount",
  "getRawMany",
  "getRawOne",
  "getRawAndEntities",
  "getExists",
] as const;

/**
 * Repository methods mocked with plain vi.fn() stubs
 */
const REPOSITORY_METHODS = [
  "findOne",
  "find",
  "findOneBy",
  "findOneOrFail",
  "findBy",
  "findAndCount",
  "findAndCountBy",
  "create",
  "save",
  "update",
  "delete",
  "remove",
  "softDelete",
  "softRemove",
  "recover",
  "restore",
  "count",
  "countBy",
  "exist",
  "existsBy",
  "insert",
  "upsert",
  "clear",
  "increment",
  "decrement",
  "merge",
  "preload",
  "hasId",
  "getId",
  "createQueryRunner",
  "extend",
] as const;

/**
 * Preset responses for the most common repository methods
 */
export interface MockRepositoryDefaults<T> {
  readonly findOne?: T | null;
  readonly find?: T[];
  readonly findAndCount?: [T[], number];
  readonly count?: number;
  readonly save?: T | T[];
}

/**
 * Creates a mock query builder for TypeORM
 * @returns Mocked SelectQueryBuilder
 */
export function createMockQueryBuilder<T extends ObjectLiteral>(): Mocked<
  SelectQueryBuilder<T>
> {
  const chainableMethods = Object.fromEntries(
    CHAINABLE_QUERY_BUILDER_METHODS.map(method => [
      method,
      vi.fn().mockReturnThis(),
    ])
  );
  const executionMethods = Object.fromEntries(
    EXECUTION_QUERY_BUILDER_METHODS.map(method => [method, vi.fn()])
  );

  return {
    ...chainableMethods,
    ...executionMethods,
  } as unknown as Mocked<SelectQueryBuilder<T>>;
}

/**
 * Creates a mock TypeORM repository with all standard methods
 * @returns Mocked repository object
 */
export function createMockRepository<T extends ObjectLiteral>(): Mocked<
  Repository<T>
> {
  const methods = Object.fromEntries(
    REPOSITORY_METHODS.map(method => [method, vi.fn()])
  );

  return {
    ...methods,
    createQueryBuilder: vi.fn().mockReturnValue(createMockQueryBuilder<T>()),
    metadata: {} as EntityMetadata,
    manager: {},
    target: {},
    queryRunner: undefined,
  } as unknown as Mocked<Repository<T>>;
}

/**
 * Creates a mock repository with preset responses
 * @param defaults - Preset return values for common repository methods
 * @returns Mocked repository with the presets applied
 */
export function createMockRepositoryWithDefaults<T extends ObjectLiteral>(
  defaults: MockRepositoryDefaults<T>
): Mocked<Repository<T>> {
  const mockRepo = createMockRepository<T>();

  if (defaults.findOne !== undefined) {
    (mockRepo.findOne as Mock).mockResolvedValue(defaults.findOne);
  }

  if (defaults.find !== undefined) {
    (mockRepo.find as Mock).mockResolvedValue(defaults.find);
  }

  if (defaults.findAndCount !== undefined) {
    (mockRepo.findAndCount as Mock).mockResolvedValue(defaults.findAndCount);
  }

  if (defaults.count !== undefined) {
    (mockRepo.count as Mock).mockResolvedValue(defaults.count);
    (mockRepo.countBy as Mock).mockResolvedValue(defaults.count);
  }

  if (defaults.save !== undefined) {
    (mockRepo.save as Mock).mockResolvedValue(defaults.save);
  }

  return mockRepo;
}
