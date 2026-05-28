# Task 7: Implement HelloResolver with Unit Tests (TDD)

## Objective
Implement the HelloResolver following TDD approach - write tests first, then implementation.

## Step 1: Write Tests First

### src/hello/hello.resolver.test.ts
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { HelloResolver } from "./hello.resolver";
import { HelloService } from "./hello.service";

describe("HelloResolver", () => {
  let resolver: HelloResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloResolver, HelloService],
    }).compile();

    resolver = module.get<HelloResolver>(HelloResolver);
  });

  describe("hello query", () => {
    it("should return 'Hello World'", () => {
      expect(resolver.hello()).toBe("Hello World");
    });
  });

  describe("greet mutation", () => {
    it("should return greeting with name", () => {
      expect(resolver.greet("Claude")).toBe("Hello, Claude!");
    });
  });
});
```

## Step 2: Run Tests (Should Fail)
```bash
bun run test:unit src/hello/hello.resolver.test.ts
```

## Step 3: Implement Resolver

### src/hello/hello.resolver.ts
```typescript
/**
 * @file hello.resolver.ts
 * @description GraphQL resolver for hello world operations
 * @module hello
 */

import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { HelloService } from "./hello.service";
import { IDataLoaders } from "../data-loader/data-loader.interface";

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
  constructor(private readonly helloService: HelloService) {}

  /**
   * GraphQL query returning Hello World
   * @returns The string "Hello World"
   * @example
   * query { hello }
   * // Returns: "Hello World"
   */
  @Query(() => String, { description: "Returns Hello World greeting" })
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
  @Mutation(() => String, { description: "Returns personalized greeting" })
  greet(@Args("name") name: string): string {
    return this.helloService.greet(name);
  }

  /**
   * GraphQL query demonstrating DataLoader usage
   * @param name - The name to greet
   * @param context - GraphQL context with DataLoaders
   * @returns Personalized greeting via DataLoader batch
   * @example
   * query { greetBatched(name: "Claude") }
   * // Returns: "Hello, Claude!" (batched with other requests)
   */
  @Query(() => String, { description: "Returns greeting via DataLoader" })
  async greetBatched(
    @Args("name") name: string,
    @Context() { loaders }: GraphQLContext
  ): Promise<string> {
    return loaders.greetingsLoader.load(name);
  }
}
```

## Step 4: Update HelloModule

### src/hello/hello.module.ts
```typescript
/**
 * @file hello.module.ts
 * @description NestJS module for hello world functionality
 * @module hello
 */

import { Module } from "@nestjs/common";
import { HelloService } from "./hello.service";
import { HelloResolver } from "./hello.resolver";

/**
 * Module encapsulating hello world functionality
 * @description Provides HelloService and HelloResolver for GraphQL operations
 */
@Module({
  providers: [HelloService, HelloResolver],
  exports: [HelloService],
})
export class HelloModule {}
```

## Step 5: Run Tests (Should Pass)
```bash
bun run test:unit src/hello/hello.resolver.test.ts
```

## Acceptance Criteria
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] JSDoc documentation on all public methods
- [ ] GraphQL decorators properly applied
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/hello/
bun run lint src/hello/
```
