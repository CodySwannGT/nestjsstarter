import "reflect-metadata";
/**
 * CI gate that boots the full AppModule against the real module graph and
 * forces GraphQLModule.onModuleInit to run. The schema build inside
 * onModuleInit is a code path no other gate exercises — lint, typecheck,
 * build and unit tests all pass while the schema itself can still explode
 * at runtime (duplicate scalar names, duplicate types, missing resolver
 * registrations).
 *
 * Bundled and executed by scripts/verify-app-boot-runner.mjs (esbuild +
 * @anatine/esbuild-decorators → node). We avoid vitest because its
 * dual-loader pipeline loads `graphql` twice and trips a spurious
 * "Cannot use X from another module or realm" failure inside the schema
 * build, and we avoid tsx/bun because neither emits the `design:type`
 * decorator metadata that TypeORM column decorators need.
 *
 * Infrastructure dependencies (Postgres, Valkey) are stubbed so the script
 * boots offline with no AWS access; the assertion is only that the module
 * graph wires up and the GraphQL schema builds.
 *
 * Exit code 0 on success, 1 on any boot or schema-build failure.
 *
 * @module scripts/verify-app-boot
 */

const REQUIRED_ENV: Record<string, string> = {
  NODE_ENV: "test",
  IS_OFFLINE: "true",
  AWS_REGION: "us-east-1",
  DATABASE_HOST: "localhost",
  DATABASE_PORT: "5432",
  DATABASE_USER: "test",
  DATABASE_PASSWORD: "test",
  DATABASE_NAME: "test",
  VALKEY_HOST: "localhost",
  VALKEY_PORT: "6379",
  COGNITO_USER_POOL_ID: "us-east-1_test",
  COGNITO_CLIENT_ID: "test",
};

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}

// Stub TypeORM's PostgresDriver before any module imports it, so
// DataSource.initialize() never opens a real socket. Patching at the
// driver level is more reliable than overriding Nest providers alone,
// which can be re-instantiated by dynamic modules.
import { PostgresDriver } from "typeorm/driver/postgres/PostgresDriver.js";
PostgresDriver.prototype.connect = async function (this: PostgresDriver) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (this as any).master = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (this as any).slaves = [];
  return Promise.resolve();
};
PostgresDriver.prototype.disconnect = async () => Promise.resolve();
PostgresDriver.prototype.afterConnect = async () => Promise.resolve();

import { Test } from "@nestjs/testing";
import { getDataSourceToken, getEntityManagerToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

/**
 * Builds a recursive proxy that satisfies the chainable surface area of a
 * TypeORM Repository / QueryBuilder. Provider constructors and
 * module-initialization paths may call repository methods we cannot
 * enumerate in advance; the proxy returns a chainable object for every
 * non-terminal call and resolves terminal calls (getMany, execute, etc.)
 * to empty results.
 *
 * @returns A proxy that responds to any property access with a no-op chain
 */
function makeChainable(): Record<string, (...args: unknown[]) => unknown> {
  return new Proxy({} as Record<string, (...args: unknown[]) => unknown>, {
    get(target, prop) {
      if (prop === "then") return undefined;
      if (typeof prop === "symbol") return undefined;
      if (!(prop in target)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[prop] = (..._args: unknown[]) => {
          const terminalArrays = new Set([
            "getMany",
            "getRawMany",
            "find",
            "findBy",
            "execute",
          ]);
          const terminalNulls = new Set([
            "getOne",
            "getRawOne",
            "findOne",
            "findOneBy",
          ]);
          const terminalNumbers = new Set(["getCount", "count"]);
          const terminalUndefineds = new Set(["save", "remove", "delete"]);
          if (terminalArrays.has(prop as string)) return Promise.resolve([]);
          if (terminalNulls.has(prop as string)) return Promise.resolve(null);
          if (terminalNumbers.has(prop as string)) return Promise.resolve(0);
          if (terminalUndefineds.has(prop as string))
            return Promise.resolve(undefined);
          return makeChainable();
        };
      }
      return target[prop];
    },
  });
}

/**
 * Boots AppModule with infrastructure providers stubbed out. Initialization
 * triggers GraphQLModule.onModuleInit which builds the schema; any
 * collision (duplicate scalar, duplicate type, missing resolver
 * registration) throws here and the script exits non-zero.
 */
async function main(): Promise<void> {
  const { AppModule } = await import("../src/app.module.js");
  const { ValkeyService } = await import("../src/valkey/valkey.service.js");

  const fakeRepository = makeChainable();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fakeRepository as any).metadata = { columns: [], relations: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fakeRepository as any).target = class {};

  const fakeEntityManager: Record<string, unknown> = {
    getRepository: () => fakeRepository,
    transaction: (cb: (m: unknown) => unknown) => cb(fakeEntityManager),
    query: async () => [],
    find: async () => [],
    findOne: async () => null,
    save: async () => undefined,
    create: (_t: unknown, e: unknown) => e,
    remove: async () => undefined,
  };

  const fakeDataSource = {
    isInitialized: true,
    initialize() {
      return Promise.resolve(this);
    },
    destroy: async () => undefined,
    getRepository: () => fakeRepository,
    createEntityManager: () => fakeEntityManager,
    createQueryRunner: () => ({
      connect: async () => undefined,
      startTransaction: async () => undefined,
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      manager: fakeEntityManager,
    }),
    manager: fakeEntityManager,
    driver: { afterConnect: async () => undefined },
    options: {},
    subscribers: [],
    entityMetadatas: [],
    hasMetadata: () => false,
  };

  const fakeValkeyService = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(getDataSourceToken())
    .useValue(fakeDataSource)
    .overrideProvider(DataSource)
    .useValue(fakeDataSource)
    .overrideProvider(getEntityManagerToken())
    .useValue(fakeEntityManager)
    .overrideProvider(ValkeyService)
    .useValue(fakeValkeyService)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  await app.close();

  // eslint-disable-next-line no-console
  console.log("✅ AppModule boots and GraphQL schema constructs successfully");
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error("❌ AppModule boot / GraphQL schema construction failed:");
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
