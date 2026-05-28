/**
 * @file hello.resolver.ts
 * @description GraphQL resolver for hello world operations
 * @module hello
 */

import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { HelloService } from "./hello.service";
import { IDataLoaders } from "../data-loader/data-loader.interface";
import { Public, Authed } from "../auth";

/**
 * GraphQL context type with loaders
 */
interface GraphQLContext {
  readonly loaders: IDataLoaders;
}

/**
 * GraphQL resolver for hello world operations
 * @description Provides hello query and greet mutation for testing GraphQL setup
 */
@Resolver()
export class HelloResolver {
  /**
   * Creates a HelloResolver instance
   * @param helloService - Service for hello operations
   */
  constructor(private readonly helloService: HelloService) {}

  /**
   * GraphQL query returning Hello World
   * @returns The string "Hello World"
   * @example
   * query { hello }
   * // Returns: "Hello World"
   */
  @Query(() => String, { description: "Public health check" })
  @Public()
  hello(): string {
    return this.helloService.getHello();
  }

  /**
   * GraphQL mutation returning personalized greeting
   * @param name - The name to greet
   * @returns Personalized greeting "Hello, {name}!"
   * @example
   * mutation { greet(name: "Claude") }
   * // Returns: "Hello, Claude!"
   */
  @Mutation(() => String, { description: "Requires authentication" })
  @Authed()
  greet(@Args("name") name: string): string {
    return this.helloService.greet(name);
  }

  /**
   * GraphQL query demonstrating DataLoader usage
   * @param name - The name to greet
   * @param context - GraphQL context containing DataLoaders
   * @param context.loaders - DataLoaders for batch loading
   * @returns Personalized greeting via DataLoader batch
   * @example
   * query { greetBatched(name: "Claude") }
   * // Returns: "Hello, Claude!" (batched with other requests)
   */
  @Query(() => String, { description: "Batched greeting via DataLoader" })
  @Authed()
  async greetBatched(
    @Args("name") name: string,
    @Context() { loaders }: GraphQLContext
  ): Promise<string> {
    return loaders.greetingsLoader.load(name);
  }
}
