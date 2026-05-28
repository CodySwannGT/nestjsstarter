# Task 5: Generate Module Skeletons Using NestJS CLI

## Objective
Use NestJS CLI to generate the basic module structure for all required modules.

## Commands to Execute

### 1. Generate Hello Module
```bash
bunx nest g module hello --no-spec
bunx nest g service hello --no-spec
bunx nest g resolver hello --no-spec
```

### 2. Generate Auth Module
```bash
bunx nest g module auth --no-spec
```

### 3. Generate DataLoader Module
```bash
bunx nest g module data-loader --no-spec
bunx nest g service data-loader --no-spec
```

### 4. Generate Health Module
```bash
bunx nest g module health --no-spec
bunx nest g controller health --no-spec
```

### 5. Create GraphQL Directory
```bash
mkdir -p src/graphql
```

## Expected Structure After Generation
```
src/
├── auth/
│   └── auth.module.ts
├── data-loader/
│   ├── data-loader.module.ts
│   └── data-loader.service.ts
├── graphql/
│   └── (empty - for complexity plugin)
├── health/
│   ├── health.controller.ts
│   └── health.module.ts
├── hello/
│   ├── hello.module.ts
│   ├── hello.resolver.ts
│   └── hello.service.ts
└── app.module.ts (auto-updated by CLI)
```

## Notes
- Using `--no-spec` because we write tests first (TDD)
- CLI may auto-update app.module.ts - will be manually configured later

## Acceptance Criteria
- [ ] All modules generated successfully
- [ ] Directory structure matches expected layout
- [ ] No generation errors

## Verification
```bash
ls -la src/
ls -la src/hello/
ls -la src/auth/
ls -la src/data-loader/
ls -la src/health/
```
