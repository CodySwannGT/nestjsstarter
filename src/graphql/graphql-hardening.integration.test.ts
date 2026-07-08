/**
 * @file graphql-hardening.integration.test.ts
 * @description Integration tests for the GraphQL hardening layer over real
 * HTTP: the depth-limit validation rule (wired exactly as app.module.ts wires
 * it — from config, with the formatError hook) and the batch-cap middleware
 * (registered via applyGraphqlHardening, exactly as both entrypoints register
 * it).
 * @module graphql
 */

import { expect } from "vitest";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { Test, TestingModule } from "@nestjs/testing";
import { getIntrospectionQuery } from "graphql";
import { ConfigModule } from "../config/config.module";
import { Configuration } from "../config/configuration";
import { depthLimitRule } from "./depth-limit.rule";
import { applyGraphqlHardening } from "./graphql-hardening";
// Fixtures live in a regular module, not inline: vitest's esbuild transform
// mis-emits decorator metadata for a self-referential decorated class defined
// directly in a spec file. See graphql-hardening.fixture.ts.
import { HardeningResolver } from "./graphql-hardening.fixture";
import { formatLimitError } from "./limit-error-format";

const TEST_MAX_DEPTH = "3";

/** Depth 4 — one level over the configured limit of 3. */
const DEEP_QUERY = "{ node { child { child { value } } } }";

/** Depth 2 — comfortably within the limit. */
const SHALLOW_QUERY = "{ node { value } }";

describe("GraphQL hardening (integration)", () => {
  const env = {
    maxDepth: process.env.GRAPHQL_MAX_DEPTH,
  };

  // eslint-disable-next-line functional/no-let -- app handle shared across the suite
  let app: INestApplication;
  // eslint-disable-next-line functional/no-let -- resolved after the app binds its port
  let url: string;

  beforeAll(async () => {
    // Env override must be in place before ConfigModule loads the factory.
    process.env.GRAPHQL_MAX_DEPTH = TEST_MAX_DEPTH;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        // Mirrors the app.module.ts wiring: rule limit from config, plus the
        // formatError hook that restores QUERY_TOO_DEEP.
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
          driver: ApolloDriver,
          inject: [ConfigService],
          useFactory: (configService: ConfigService<Configuration, true>) => ({
            autoSchemaFile: true,
            validationRules: [
              depthLimitRule(
                configService.get("graphql.maxDepth", { infer: true })
              ),
            ],
            formatError: formatLimitError,
          }),
        }),
      ],
      providers: [HardeningResolver],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyGraphqlHardening(app);
    await app.listen(0);
    url = `${await app.getUrl()}/graphql`;
  });

  afterAll(async () => {
    process.env.GRAPHQL_MAX_DEPTH = env.maxDepth;
    if (env.maxDepth === undefined) delete process.env.GRAPHQL_MAX_DEPTH;
    await app?.close();
  });

  /**
   * POST a JSON body to the app's /graphql endpoint.
   * @param body - The request payload (single operation or batch array).
   * @param headers - Extra request headers.
   * @returns The fetch response.
   */
  const post = (
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  it("rejects an over-deep query with HTTP 400 and QUERY_TOO_DEEP", async () => {
    const response = await post({ query: DEEP_QUERY });
    const payload = (await response.json()) as {
      data?: unknown;
      errors: readonly { message: string; extensions: { code: string } }[];
    };

    expect(response.status).toBe(400);
    expect(payload.errors[0].extensions.code).toBe("QUERY_TOO_DEEP");
    expect(payload.errors[0].message).toBe(
      "Query exceeds the maximum operation depth of 3."
    );
    expect(payload.data ?? null).toBeNull();
  });

  it("lets a shallow query through and resolves data", async () => {
    const response = await post({ query: SHALLOW_QUERY });
    const payload = (await response.json()) as {
      data: { node: { value: string } };
      errors?: unknown;
    };

    expect(response.status).toBe(200);
    expect(payload.errors).toBeUndefined();
    expect(payload.data.node.value).toBe("root");
  });

  it("lets a full introspection query through despite its depth", async () => {
    const response = await post({ query: getIntrospectionQuery() });
    const payload = (await response.json()) as {
      data: { __schema: unknown };
      errors?: unknown;
    };

    expect(response.status).toBe(200);
    expect(payload.errors).toBeUndefined();
    expect(payload.data.__schema).toBeDefined();
  });

  it("rejects an over-cap batched POST with 400 BATCH_TOO_LARGE before Apollo runs", async () => {
    const batch = Array.from({ length: 11 }, () => ({ query: SHALLOW_QUERY }));
    const response = await post(batch);
    const payload = (await response.json()) as {
      data?: unknown;
      errors: readonly { message: string; extensions: { code: string } }[];
    };

    expect(response.status).toBe(400);
    expect(payload.errors[0].extensions.code).toBe("BATCH_TOO_LARGE");
    expect(payload.errors[0].message).toBe(
      "Batched request exceeds the maximum of 10 operations per request."
    );
    expect(payload).not.toHaveProperty("data");
    // The pre-init short-circuit sets ACAO itself (Nest's cors runs later).
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("does not batch-cap a within-cap array (it reaches Apollo)", async () => {
    const batch = Array.from({ length: 2 }, () => ({ query: SHALLOW_QUERY }));
    const response = await post(batch);

    // Batching is not enabled in this fixture, so Apollo itself rejects the
    // array — but NOT with the middleware's BATCH_TOO_LARGE contract, proving
    // the cap only fires above the configured limit.
    const text = await response.text();
    expect(text).not.toContain("BATCH_TOO_LARGE");
  });
});
