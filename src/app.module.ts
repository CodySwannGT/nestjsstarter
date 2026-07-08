/**
 * @file app.module.ts
 * @description Root application module for NestJS
 * @module app
 */

import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { Request, Response } from "express";
import { join } from "path";
import { AuthModule } from "./auth/auth.module";
import { combinedAuthTransformer } from "./auth/auth.transformer";
import { ConfigModule } from "./config/config.module";
import { Configuration } from "./config/configuration";
import { DataLoaderModule } from "./data-loader/data-loader.module";
import { DataLoaderService } from "./data-loader/data-loader.service";
import { DatabaseModule } from "./database/database.module";
import { ComplexityPlugin } from "./graphql/complexity.plugin";
import { OperationLoggingPlugin } from "./graphql/operation-logging.plugin";
import { HealthModule } from "./health/health.module";
import { HelloModule } from "./hello/hello.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { ValkeyModule } from "./valkey/valkey.module";

/**
 * Root application module
 * @description Configures global ConfigModule, GraphQL with Apollo driver, DataLoaders, and imports feature modules
 * @remarks
 * - ConfigModule is global and loads from .env.local or .env files
 * - Environment variables: IS_OFFLINE, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, AWS_REGION
 */
@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataLoaderModule],
      inject: [DataLoaderService, ConfigService],
      useFactory: (
        dataLoaderService: DataLoaderService,
        configService: ConfigService<Configuration, true>
      ) => ({
        autoSchemaFile: configService.get("app.isOffline", { infer: true })
          ? join(process.cwd(), "src/schema.gql")
          : true,
        sortSchema: true,
        playground: false,
        introspection: true,
        // graphql-ws transport for local development only; deployed
        // subscriptions are delivered through API Gateway WebSockets
        subscriptions: configService.get("app.isOffline", { infer: true })
          ? { "graphql-ws": true }
          : undefined,
        // Transform schema to enforce auth rules from extensions
        transformSchema: schema => combinedAuthTransformer(schema),
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          loaders: dataLoaderService.getLoaders(),
        }),
      }),
    }),
    AuthModule,
    DataLoaderModule,
    DatabaseModule,
    HealthModule,
    HelloModule,
    SubscriptionModule,
    ValkeyModule,
  ],
  providers: [ComplexityPlugin, OperationLoggingPlugin],
})
export class AppModule {}
