# Task 3: Create Jest Configuration for Testing

## Objective
Create Jest configuration file for NestJS testing with TypeScript support.

## File to Create

### jest.config.ts
```typescript
import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.test\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s", "!**/main.ts", "!**/*.module.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
```

## Notes
- Test files use `.test.ts` extension (not `.spec.ts`)
- Module alias `@/` maps to root directory
- Coverage excludes main.ts and module files

## Acceptance Criteria
- [ ] jest.config.ts created at project root
- [ ] Test command runs without errors
- [ ] ts-jest properly transforms TypeScript

## Verification
```bash
bun run test:unit
```
