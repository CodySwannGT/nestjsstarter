---
date: 2026-01-12T15:30:00-05:00
status: complete
last_updated: 2026-01-12
---

# Research: NestJS + Serverless + GraphQL Backend Bootstrap

## Summary

This research documents the architecture patterns, code structures, and implementation details from the reference codebase at `/Users/cody/workspace/sample-project/backend-v2` that will guide the implementation of a minimal NestJS + Express + Serverless + GraphQL (Apollo, code-first) backend for the thumbwar project. The reference codebase provides production-tested patterns for GraphQL configuration, DataLoader implementation, zero-trust authentication, and serverless deployment.

## Detailed Findings

### 1. NestJS GraphQL Code-First Configuration

The reference codebase uses NestJS GraphQL with Apollo driver in code-first mode.

**App Module GraphQL Configuration** (`/Users/cody/workspace/sample-project/backend-v2/src/app.module.ts:197-259`):

```typescript
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [DataLoaderModule, UsersModule],
  inject: [ConfigService, DataLoaderService, UsersService, SentryService],
  useFactory: async (
    configService: ConfigService,
    dataLoaderService: DataLoaderService,
    usersService: UsersService,
    sentryService: SentryService
  ) => {
    const graphqlConfig = configService.get("graphql");
    return {
      ...graphqlConfig,
      context: async ({ req }: { req: Request; res: Response }) => {
        // JWT validation and user loading
        const token = authHeader ? authHeader.split(" ")[1] : null;
        const payload = await getJwtPayload(token, ...);
        const currentUser = !payload ? null : await usersService.getUserFromTokenPayload(payload);

        return {
          req: { ...req, headers: req.headers, user: currentUser },
          loaders: dataLoaderService.getLoaders(),
        };
      },
      transformSchema: schema => {
        let transformedSchema = authDirectiveTransformer(schema, "auth");
        return transformedSchema;
      },
    };
  },
}),
```

**GraphQL Config** (`/Users/cody/workspace/sample-project/backend-v2/src/config/graphql.config.ts`):

Key configuration options:
- `autoSchemaFile`: Path to file in local dev, `true` for in-memory in Lambda
- `sortSchema: true`: Alphabetically sorted schema
- `playground: false`: Disabled in production
- `buildSchemaOptions.directives`: Custom directive definitions (auth, public)
- `transformSchema`: Schema transformer for auth enforcement

### 2. Lambda Handler Pattern

**Main Entry Point** (`/Users/cody/workspace/sample-project/backend-v2/src/main.ts`):

```typescript
import { NestFactory } from "@nestjs/core";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import { AppModule } from "./app.module";

let cachedServer: any;

export const handler = async (event: any, context: any) => {
  if (!cachedServer) {
    const nestApp = await NestFactory.create(AppModule, {
      cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204,
      },
    });
    await nestApp.init();
    const app = nestApp.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app });
  }
  return cachedServer(event, context);
};
```

Key patterns:
- Server caching for Lambda warm starts
- CORS configuration at app creation
- Uses `@vendia/serverless-express` for Lambda integration

### 3. Serverless Framework Configuration

**Serverless Configuration** (`/Users/cody/workspace/sample-project/backend-v2/serverless.yml`):

Key configuration sections:

```yaml
service: sample-project-backend
frameworkVersion: '^4.0.0'

custom:
  esbuild:
    bundle: true
    minify: true
    keepNames: true
    platform: node
    target: node20
    external:
      - 'fsevents'
      - '@nestjs/websockets'
      - '@nestjs/microservices'
      - '@apollo/gateway'
      - '@apollo/subgraph'
      - '@as-integrations/fastify'
      - 'class-transformer/storage'

plugins:
  - serverless-esbuild
  - serverless-offline

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  httpApi:
    cors: true

functions:
  main:
    handler: src/main.handler
    timeout: 29
    memorySize: 2048
    events:
      - httpApi:
          method: any
          path: /{proxy+}
```

Important notes:
- External packages to prevent bundling errors with optional dependencies
- HTTP API (API Gateway v2) for better performance
- Warm-up plugin for keeping Lambda instances warm
- ESBuild for fast bundling

### 4. DataLoader Implementation

**DataLoader Interface** (`/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.interface.ts`):

```typescript
export interface IDataLoaders {
  usersLoader: DataLoader<string, User>;
  organizationsLoader: DataLoader<string, Organization>;
  teamsLoader: DataLoader<string, Team>;
  // Complex key patterns for context-aware loaders
  playerBioDataLoader: DataLoader<{ id: string; user: User }, PlayerBioData | null>;
  playerScoutReportsLoader: DataLoader<{ playerGgId: string; user: User }, PlayerScoutReport[]>;
}
```

**DataLoader Service** (`/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.service.ts`):

```typescript
@Injectable()
export class DataLoaderService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    // ... other injections
  ) {}

  getLoaders(): IDataLoaders {
    return {
      usersLoader: this._createUsersLoader(),
      organizationsLoader: this._createOrganizationsLoader(),
      teamsLoader: this._createTeamsLoader(),
      // ... all loaders
    };
  }

  private _createTeamsLoader() {
    return new DataLoader<string, Team>(async (ids: string[]) => {
      const teams = await this.teamRepository.find({ where: { id: In(ids) } });
      const teamMap = new Map(teams.map(team => [team.id, team]));
      return ids.map(id => teamMap.get(id) || null);
    });
  }

  // Generic helper for simple entity loaders
  private createSimpleLoader<T extends ObjectLiteral>(repository: Repository<T>) {
    return new DataLoader<string, T>(
      async (keys: string[]) => await this.getEntitiesByBatch(keys, repository)
    );
  }
}
```

Key patterns:
- Fresh loader instances per request via `getLoaders()`
- Order preservation in batch results
- Null handling for missing entities
- Complex keys with user context for permission-aware data loading
- Generic helper method for simple entity loaders

**DataLoader Module** (`/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.module.ts`):

```typescript
@Module({
  imports: [
    UsersModule,
    WatchlistModule,
    TypeOrmModule.forFeature([Team, League, ...]),
    // ... feature modules
  ],
  providers: [DataLoaderService, ...repositories],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
```

### 5. Zero-Trust Auth System

**Auth Directive Transformer** (`/Users/cody/workspace/sample-project/backend-v2/src/auth/auth.directive.ts`):

The reference uses a **directive-based** approach (not extensions as mentioned in the brief):

```typescript
export function authDirectiveTransformer(schema: GraphQLSchema, directiveName: string) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      // Only apply to Query and Mutation types
      if (typeName !== "Query" && typeName !== "Mutation") {
        return fieldConfig;
      }

      // Check for @public directive - allows without auth
      const publicDirective = getDirective(schema, fieldConfig, "public")?.[0];
      if (publicDirective) {
        return fieldConfig;
      }

      // Check for @auth directive
      const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (authDirective) {
        const { rules } = authDirective;
        if (rules) {
          const { resolve = defaultFieldResolver } = fieldConfig;
          fieldConfig.resolve = async function (source, args, context, info) {
            ensurePermissionsOrThrowError(rules, context, info);
            return await resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }

      // DENY-BY-DEFAULT: No auth decorator throws runtime error
      return {
        ...fieldConfig,
        resolve: async () => {
          throw new GraphQLError(
            `Operation '${fieldName}' has no auth decorator. Add @AuthPrivate(), @AuthPrivateNoOrg(), @AuthGroups(), or @Public() to the resolver.`,
            { extensions: { code: "MISSING_AUTH_DIRECTIVE" } }
          );
        },
      };
    },
  });
}
```

**Auth Decorators** (`/Users/cody/workspace/sample-project/backend-v2/src/auth/decorators/`):

```typescript
// auth-private.decorator.ts
export const AuthPrivate = (): MethodDecorator & ClassDecorator =>
  Directive("@auth(rules: [{ allow: private }])");

// auth-public.decorator.ts
export const Public = (): MethodDecorator & ClassDecorator =>
  Directive("@public");

// auth-groups.decorator.ts
export const AuthGroups = (...groups: readonly Group[]): MethodDecorator & ClassDecorator => {
  if (groups.length === 0) {
    throw new Error("AuthGroups requires at least one group");
  }
  return Directive(
    `@auth(rules: [{ allow: groups, groups: [${groups.map(g => `"${g}"`).join(", ")}] }])`
  );
};

// auth-private-no-org.decorator.ts (for operations not requiring organization)
export const AuthPrivateNoOrg = (): MethodDecorator & ClassDecorator =>
  Directive("@auth(rules: [{ allow: private, requireOrganization: false }])");
```

**Auth Types** (`/Users/cody/workspace/sample-project/backend-v2/src/common/common.dto.ts`):

```typescript
export enum AuthAllow {
  groups = "groups",
  "private" = "private",
}

export class AuthRule {
  allow: AuthAllow;
  groups?: Nullable<Group[]>;
  requireOrganization?: boolean;
}

export enum Group {
  Admins = "Admins",
}
```

**GraphQL Directive Definitions** (`/Users/cody/workspace/sample-project/backend-v2/src/config/graphql.config.ts`):

```typescript
const authDirective = new GraphQLDirective({
  name: "auth",
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    rules: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(AuthRuleInput))),
    },
  },
});

const publicDirective = new GraphQLDirective({
  name: "public",
  description: "Marks a field as publicly accessible without authentication",
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
});

// Used in buildSchemaOptions
buildSchemaOptions: {
  directives: [authDirective, publicDirective],
},
```

### 6. Custom GraphQL Errors

**Error Classes** (`/Users/cody/workspace/sample-project/backend-v2/src/common/utils/graphql-exceptions.ts`):

```typescript
class CustomError extends GraphQLError {
  constructor(message: string, code: string, options?: GraphQLErrorOptions) {
    super(message, {
      ...options,
      extensions: { code, ...options?.extensions },
    });
  }
}

export class UnauthorizedError extends GraphQLError {
  constructor(message = "Not authorized") {
    super(message, { extensions: { code: "UNAUTHORIZED_EXCEPTION" } });
    Object.defineProperty(this, "name", { value: "UnauthorizedError" });
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string, options?: GraphQLErrorOptions) {
    super(message, "NOT_FOUND_EXCEPTION", options);
  }
}

export class BadRequestError extends CustomError { ... }
export class ForbiddenError extends CustomError { ... }
```

### 7. Resolver Patterns

**Resolver with Auth Decorators** (`/Users/cody/workspace/sample-project/backend-v2/src/users/users.resolver.ts`):

```typescript
@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly cognitoService: CognitoService,
  ) {}

  @Query(() => User, { nullable: true, name: "me" })
  @AuthPrivateNoOrg()
  async getMe(@CurrentUser() user: UserEntity): Promise<User | null> {
    return !user?.id ? null : this.usersService.getCurrentUser(user.id);
  }

  @Mutation(() => User, { name: "updateMyProfile" })
  @AuthPrivateNoOrg()
  async updateMyProfile(
    @Args("input") input: UpdateMyProfileInput,
    @CurrentUser() user: UserEntity
  ): Promise<User> {
    return this.usersService.updateUserProfile(user.id, input);
  }

  @ResolveField("organization", () => Organization, { nullable: true })
  async getOrganization(
    @Parent() user: UserEntity,
    @Context() { loaders }: { loaders: IDataLoaders }
  ): Promise<Organization | null> {
    return user.organizationId ? loaders.organizationsLoader.load(user.organizationId) : null;
  }
}
```

### 8. Dependencies

**Reference Package.json** (`/Users/cody/workspace/sample-project/backend-v2/package.json`):

Core dependencies:
```json
{
  "dependencies": {
    "@apollo/server": "^4.10.5",
    "@graphql-tools/utils": "10.3.4",
    "@nestjs/apollo": "^12.2.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.0.0",
    "@nestjs/graphql": "^12.2.0",
    "@nestjs/platform-express": "^10.0.0",
    "@vendia/serverless-express": "^4.12.6",
    "dataloader": "^2.2.2",
    "graphql": "^16.9.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/aws-lambda": "^8.10.143",
    "@types/express": "^4.17.17",
    "serverless": "^4.0.0",
    "serverless-esbuild": "1.55.1",
    "serverless-offline": "^14.4.0",
    "ts-jest": "^29.1.0"
  }
}
```

## Code References

### Core Architecture Files
- `/Users/cody/workspace/sample-project/backend-v2/src/app.module.ts` - Root module with GraphQL configuration
- `/Users/cody/workspace/sample-project/backend-v2/src/main.ts` - Lambda handler entry point
- `/Users/cody/workspace/sample-project/backend-v2/serverless.yml` - Serverless Framework configuration

### DataLoader Implementation
- `/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.interface.ts` - IDataLoaders interface
- `/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.service.ts` - DataLoader service with batch loaders
- `/Users/cody/workspace/sample-project/backend-v2/src/data-loader/data-loader.module.ts` - DataLoader module

### Auth System
- `/Users/cody/workspace/sample-project/backend-v2/src/auth/auth.directive.ts` - Auth directive transformer
- `/Users/cody/workspace/sample-project/backend-v2/src/auth/decorators/auth-private.decorator.ts` - @AuthPrivate decorator
- `/Users/cody/workspace/sample-project/backend-v2/src/auth/decorators/auth-public.decorator.ts` - @Public decorator
- `/Users/cody/workspace/sample-project/backend-v2/src/auth/decorators/auth-groups.decorator.ts` - @AuthGroups decorator
- `/Users/cody/workspace/sample-project/backend-v2/src/config/graphql.config.ts` - GraphQL config with directive definitions

### Error Handling
- `/Users/cody/workspace/sample-project/backend-v2/src/common/utils/graphql-exceptions.ts` - Custom GraphQL error classes

### Example Resolvers
- `/Users/cody/workspace/sample-project/backend-v2/src/users/users.resolver.ts` - User resolver with auth decorators

## Architecture Documentation

### Overall Architecture Pattern
The reference codebase follows a modular NestJS architecture with:
1. **Feature modules** - Each domain (users, auth, watchlist) has its own module
2. **DataLoader module** - Centralized DataLoader service with per-request loader instances
3. **Auth module** - Zero-trust authentication with directive-based authorization
4. **GraphQL code-first** - Schema generated from TypeScript decorators

### Key Design Decisions

1. **Directive-based Auth (not Extensions)**: The reference uses `@Directive()` decorator to apply auth rules, which requires directive definitions in `buildSchemaOptions`. This differs from the brief's suggested `@Extensions()` approach.

2. **Deny-by-default**: Every Query/Mutation must have explicit auth decorator or runtime error is thrown.

3. **Per-request DataLoaders**: Fresh loader instances created for each request to prevent cross-request caching issues.

4. **Organization-aware Auth**: Auth rules can require `organizationId` on the user context.

## Testing Patterns

### Unit Test Patterns
- **Location**: `src/**/*.spec.ts`
- **Framework**: Jest with ts-jest
- **Example to follow**: `/Users/cody/workspace/sample-project/backend-v2/src/auth/auth.directive.spec.ts`
- **Conventions**:
  - Tests co-located with source files
  - Describe blocks for logical groupings
  - Mock implementations for internal functions
  - GraphQL schema execution for integration-like tests

### Test Structure Example
```typescript
describe("Auth Directive", () => {
  describe("checkGroupMatch", () => {
    it("should return false when no rules have groups", () => { ... });
    it("should return true when rule groups match user groups", () => { ... });
  });

  describe("Deny-By-Default Authorization", () => {
    it("should allow @public directive to bypass auth checks", async () => {
      const schema = createTestSchema();
      const transformedSchema = authDirectiveTransformer(schema, "auth");
      const result = await execute({ schema: transformedSchema, document: query, contextValue });
      expect(result.errors).toBeUndefined();
    });
  });
});
```

### Integration Test Patterns
- **Location**: `src/**/*.integration-spec.ts`
- **Example**: `/Users/cody/workspace/sample-project/backend-v2/src/auth/auth.integration.spec.ts`
- **Conventions**: Test with real NestJS testing module

## Documentation Patterns

### JSDoc Conventions
- **Style**: JSDoc with @param, @returns, @example tags
- **Example**: `/Users/cody/workspace/sample-project/backend-v2/src/auth/decorators/auth-private.decorator.ts`
- **Required tags**: @param for function parameters, @returns for return values, @example for usage examples

### GraphQL Descriptions
- **Convention**: Description option in decorators
- **Example**:
```typescript
@Query(() => User, { nullable: true, description: "Get current authenticated user" })
@Mutation(() => User, { name: "updateMyProfile", deprecationReason: "Use X instead" })
```

## Current Project State

### TypeScript Configuration
- **Location**: `/Users/cody/workspace/thumbwar/backend/tsconfig.json`
- **Missing for NestJS**: `emitDecoratorMetadata`, `experimentalDecorators`, `strictPropertyInitialization: false`

### Package Manager
- Uses **Bun** (per `package.json` engines and CLAUDE.md)

### Existing Structure
- No `src/` directory exists yet
- `projects/` directory contains this project
- ESLint and Prettier configured

## Important Implementation Considerations

### Brief vs Reference Discrepancy: Auth Approach

The brief suggests using `@Extensions()` decorator approach, but the reference codebase uses `@Directive()` decorator approach. Key differences:

| Aspect | Brief (@Extensions) | Reference (@Directive) |
|--------|---------------------|------------------------|
| Decorator | `Extensions({ [AUTH_KEY]: {...} })` | `Directive("@auth(rules: [...])")` |
| Schema | No directive definitions needed | Requires `buildSchemaOptions.directives` |
| Parsing | Direct object access | String parsing via `getDirective()` |
| Complexity | Simpler implementation | More setup, but production-tested |

**Recommendation**: Follow the reference codebase's `@Directive()` approach since it's production-tested and handles edge cases.

### AWS Stubbing Requirements

Per the brief, AWS resources are not configured yet:
- Cognito JWT validation should be stubbed
- `context.req.user` should be populated from mock user for local development
- Database operations should use in-memory or mock implementations

### Query Complexity Plugin

The brief includes query complexity protection, but the reference codebase does not implement this. This will need to be added following the NestJS Apollo documentation pattern.

## Open Questions

### Q1: Auth Approach - Directive vs Extensions
**Question**: Should we follow the brief's `@Extensions()` approach or the reference's `@Directive()` approach for auth decorators?
**Context**: The brief suggests Extensions for simplicity, but the reference uses Directive with production-tested patterns.
**Impact**: Affects auth decorator implementation, GraphQL config, and schema transformer.
**Answer**: _Follow the reference's @Directive() approach since it's production-tested and the brief is a specification, not the source of truth for implementation patterns._

### Q2: Owner Auth at Operation Level
**Question**: The brief mentions Owner auth is not supported at operation level. Should we include the warning logic from the brief, or omit Owner auth entirely for the bootstrap?
**Context**: Owner auth only works at field level where parent source is available.
**Impact**: Auth decorator set and documentation.
**Answer**: _Include the warning as documentation, but don't implement Owner decorator for the bootstrap since it's a hello-world example without entities._

### Q3: Health Check Implementation
**Question**: Should the health check be a REST endpoint (Controller) or a GraphQL query with @Public?
**Context**: The brief shows a REST controller at `/health`, but GraphQL could also expose a public health query.
**Impact**: Whether to create a separate HealthModule with Controller.
**Answer**: _Implement as REST endpoint for ALB health checks compatibility._
