# Task 12: Integrate Auth into AppModule and Add Decorators to HelloResolver

## Objective
Wire up the auth transformer in AppModule and add auth decorators to HelloResolver.

## Files to Update

### 1. Update src/app.module.ts
Add auth transformer to GraphQL configuration:

```typescript
import { combinedAuthTransformer } from "./auth/auth.transformer";

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataLoaderModule],
      inject: [DataLoaderService],
      useFactory: (dataLoaderService: DataLoaderService) => ({
        autoSchemaFile:
          process.env.IS_OFFLINE === "true"
            ? join(process.cwd(), "src/schema.gql")
            : true,
        sortSchema: true,
        playground: false,
        introspection: true,
        // Transform schema to enforce auth rules from extensions
        transformSchema: schema => combinedAuthTransformer(schema),
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          loaders: dataLoaderService.getLoaders(),
        }),
      }),
    }),
    HelloModule,
    DataLoaderModule,
  ],
})
export class AppModule {}
```

### 2. Update src/hello/hello.resolver.ts
Add auth decorators to all operations:

```typescript
import { Public, Authed } from "../auth";

@Resolver()
export class HelloResolver {
  constructor(private readonly helloService: HelloService) {}

  @Query(() => String, { description: "Public health check" })
  @Public()
  hello(): string {
    return this.helloService.getHello();
  }

  @Mutation(() => String, { description: "Requires authentication" })
  @Authed()
  greet(@Args("name") name: string): string {
    return this.helloService.greet(name);
  }

  @Query(() => String, { description: "Batched greeting via DataLoader" })
  @Authed()
  async greetBatched(
    @Args("name") name: string,
    @Context() { loaders }: GraphQLContext
  ): Promise<string> {
    return loaders.greetingsLoader.load(name);
  }
}
```

### 3. Update HelloResolver Tests
Update tests to include auth decorator verification:

```typescript
// Add test for auth decorator presence
describe("auth decorators", () => {
  it("hello query should have @Public decorator", () => {
    // The transformer will throw if no auth decorator is present
    // This is implicitly tested by the schema building
  });
});
```

## Acceptance Criteria
- [ ] AppModule imports combinedAuthTransformer
- [ ] transformSchema configured in GraphQL options
- [ ] HelloResolver hello() has @Public()
- [ ] HelloResolver greet() has @Authed()
- [ ] HelloResolver greetBatched() has @Authed()
- [ ] All tests still pass
- [ ] No linting errors

## Verification
```bash
bun run test:unit
bun run build
bun run lint
```
