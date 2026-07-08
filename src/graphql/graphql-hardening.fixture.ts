/**
 * @file graphql-hardening.fixture.ts
 * @description Code-first GraphQL fixtures for the hardening integration test:
 * a self-referential object type so a query can nest arbitrarily deep, plus a
 * minimal resolver exposing it.
 * @module graphql
 * @remarks
 * These `@nestjs/graphql`-decorated classes deliberately live in a regular
 * module rather than inline in the `.test.ts` file. Vitest's esbuild transform
 * mis-emits `emitDecoratorMetadata` for a self-referential decorated class
 * defined directly inside a spec file (it throws "SyntaxError: Invalid or
 * unexpected token" at import), but transforms the identical class correctly
 * when it is imported from a normal source module — the same path every real
 * resolver takes.
 */
import { Field, ObjectType, Query, Resolver } from "@nestjs/graphql";

/** Self-referential object type so a query can nest arbitrarily deep. */
@ObjectType()
export class HardeningNode {
  /** Leaf scalar so shallow queries have something to select. */
  @Field({ nullable: true })
  value?: string;

  /** Recursive edge used to grow query depth. */
  @Field(() => HardeningNode, { nullable: true })
  child?: HardeningNode;
}

/** Minimal resolver exposing the recursive node. */
@Resolver()
export class HardeningResolver {
  /**
   * Recursive node used to grow depth; returns a small real object graph.
   * @returns A two-level node graph.
   */
  @Query(() => HardeningNode, { nullable: true })
  node(): HardeningNode {
    return { value: "root", child: { value: "c1" } };
  }
}
