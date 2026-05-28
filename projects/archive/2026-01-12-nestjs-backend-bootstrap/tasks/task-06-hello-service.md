# Task 6: Implement HelloService with Unit Tests (TDD)

## Objective
Implement the HelloService following TDD approach - write tests first, then implementation.

## Step 1: Write Tests First

### src/hello/hello.service.test.ts
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { HelloService } from "./hello.service";

describe("HelloService", () => {
  let service: HelloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloService],
    }).compile();

    service = module.get<HelloService>(HelloService);
  });

  describe("getHello", () => {
    it("should return 'Hello World'", () => {
      expect(service.getHello()).toBe("Hello World");
    });
  });

  describe("greet", () => {
    it("should return personalized greeting", () => {
      expect(service.greet("World")).toBe("Hello, World!");
    });
  });

  describe("getGreetingsByBatch", () => {
    it("should return greetings for multiple names", async () => {
      const names = ["Alice", "Bob", "Charlie"];
      const result = await service.getGreetingsByBatch(names);
      expect(result).toEqual([
        "Hello, Alice!",
        "Hello, Bob!",
        "Hello, Charlie!",
      ]);
    });
  });
});
```

## Step 2: Run Tests (Should Fail)
```bash
bun run test:unit src/hello/hello.service.test.ts
```

## Step 3: Implement Service

### src/hello/hello.service.ts
```typescript
/**
 * @file hello.service.ts
 * @description Service providing hello world functionality
 * @module hello
 */

import { Injectable } from "@nestjs/common";

/**
 * Service for greeting operations
 * @description Provides greeting functionality for Hello World demonstration
 */
@Injectable()
export class HelloService {
  /**
   * Returns the classic Hello World greeting
   * @returns The greeting string "Hello World"
   */
  getHello(): string {
    return "Hello World";
  }

  /**
   * Returns a personalized greeting
   * @param name - The name to include in the greeting
   * @returns A personalized greeting in format "Hello, {name}!"
   */
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  /**
   * Batch loads greetings for multiple names (for DataLoader)
   * @param names - Array of names to greet
   * @returns Promise resolving to array of greetings in same order as input
   * @remarks Used by DataLoader for batching - maintains input order
   */
  async getGreetingsByBatch(names: readonly string[]): Promise<string[]> {
    return names.map(name => this.greet(name));
  }
}
```

## Step 4: Run Tests (Should Pass)
```bash
bun run test:unit src/hello/hello.service.test.ts
```

## Acceptance Criteria
- [ ] Tests written before implementation
- [ ] Tests initially fail
- [ ] Implementation makes all tests pass
- [ ] JSDoc documentation on all public methods
- [ ] No linting errors

## Verification
```bash
bun run test:unit src/hello/hello.service.test.ts
bun run lint src/hello/
```
