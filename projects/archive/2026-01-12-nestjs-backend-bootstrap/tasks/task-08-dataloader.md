# Task 8: Implement DataLoader Interface and Service with Tests (TDD)

## Objective
Implement DataLoader pattern for N+1 prevention following TDD approach.

## Step 1: Create Interface First

### src/data-loader/data-loader.interface.ts
```typescript
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
```

## Step 2: Write Tests

### src/data-loader/data-loader.service.test.ts
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { DataLoaderService } from "./data-loader.service";
import { HelloService } from "../hello/hello.service";

describe("DataLoaderService", () => {
  let service: DataLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataLoaderService, HelloService],
    }).compile();

    service = module.get<DataLoaderService>(DataLoaderService);
  });

  describe("getLoaders", () => {
    it("should return an object with greetingsLoader", () => {
      const loaders = service.getLoaders();
      expect(loaders).toHaveProperty("greetingsLoader");
    });

    it("greetingsLoader should batch load greetings", async () => {
      const loaders = service.getLoaders();
      const result = await loaders.greetingsLoader.load("Test");
      expect(result).toBe("Hello, Test!");
    });

    it("greetingsLoader should batch multiple requests", async () => {
      const loaders = service.getLoaders();
      const [result1, result2] = await Promise.all([
        loaders.greetingsLoader.load("Alice"),
        loaders.greetingsLoader.load("Bob"),
      ]);
      expect(result1).toBe("Hello, Alice!");
      expect(result2).toBe("Hello, Bob!");
    });
  });
});
```

## Step 3: Run Tests (Should Fail)
```bash
bun run test:unit src/data-loader/data-loader.service.test.ts
```

## Step 4: Implement Service

### src/data-loader/data-loader.service.ts
```typescript
/**
 * @file data-loader.service.ts
 * @description Service that creates DataLoader instances for each GraphQL request
 * @module data-loader
 */

import { Injectable } from "@nestjs/common";
import DataLoader from "dataloader";
import { HelloService } from "../hello/hello.service";
import { IDataLoaders } from "./data-loader.interface";

/**
 * Service for creating DataLoader instances
 * @description Creates fresh DataLoader instances per request for N+1 prevention
 * @remarks
 * - Call getLoaders() once per GraphQL request in context factory
 * - Each loader batches and caches within the request scope
 * - Add new loader creation methods as features grow
 */
@Injectable()
export class DataLoaderService {
  constructor(private readonly helloService: HelloService) {}

  /**
   * Creates all DataLoader instances for a single request
   * @returns Object containing all typed DataLoaders
   * @remarks Called in GraphQL context factory - creates fresh instances per request
   */
  getLoaders(): IDataLoaders {
    return {
      greetingsLoader: this.createGreetingsLoader(),
    };
  }

  /**
   * Creates a DataLoader for batch loading greetings
   * @returns DataLoader that batches greeting requests by name
   */
  private createGreetingsLoader(): DataLoader<string, string> {
    return new DataLoader<string, string>(async (names: readonly string[]) => {
      const greetings = await this.helloService.getGreetingsByBatch([...names]);
      return greetings;
    });
  }
}
```

## Step 5: Update DataLoaderModule

### src/data-loader/data-loader.module.ts
```typescript
/**
 * @file data-loader.module.ts
 * @description NestJS module for DataLoader functionality
 * @module data-loader
 */

import { Module } from "@nestjs/common";
import { DataLoaderService } from "./data-loader.service";
import { HelloModule } from "../hello/hello.module";

/**
 * Module providing DataLoader services for GraphQL N+1 prevention
 * @description Imports feature modules and exports DataLoaderService
 * @remarks Add feature module imports here as the application grows
 */
@Module({
  imports: [HelloModule],
  providers: [DataLoaderService],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
```

## Step 6: Run Tests (Should Pass)
```bash
bun run test:unit src/data-loader/data-loader.service.test.ts
```

## Acceptance Criteria
- [ ] Interface created with proper types
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] JSDoc documentation on all public methods
- [ ] Module properly exports service
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/data-loader/
bun run lint src/data-loader/
```
