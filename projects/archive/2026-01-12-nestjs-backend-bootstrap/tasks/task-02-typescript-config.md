# Task 2: Configure TypeScript for NestJS and Create nest-cli.json

## Objective
Update TypeScript configuration to support NestJS decorators and create NestJS CLI configuration.

## Files to Modify/Create

### 1. Update tsconfig.json
Add the following to compilerOptions:
```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false
  }
}
```

### 2. Create nest-cli.json
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

## Acceptance Criteria
- [ ] tsconfig.json updated with decorator support
- [ ] nest-cli.json created at project root
- [ ] TypeScript compilation succeeds
- [ ] NestJS CLI commands work (bunx nest --version)

## Verification
```bash
bun run build
bunx nest --version
```
