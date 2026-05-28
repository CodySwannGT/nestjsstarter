/**
 * @file subscription.module.ts
 * @description NestJS module for GraphQL subscription infrastructure
 * @module subscription
 */

import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Configuration } from "../config/configuration";
import { ValkeyModule } from "../valkey/valkey.module";
import { ValkeyService } from "../valkey/valkey.service";
import { LocalPubSub } from "./pubsub/local-pubsub";
import { ValkeyPubSub } from "./pubsub/valkey-pubsub";

/** Injection token for PubSub service */
export const PUB_SUB = "PUB_SUB";

/**
 * Module providing GraphQL subscription infrastructure
 * @description Global module that provides PubSub to all other modules using facade pattern
 * @remarks
 * - Marked as @Global so it doesn't need to be imported in each feature module
 * - Provides PUB_SUB token for injection in resolvers
 * - Uses factory to select LocalPubSub (IS_OFFLINE=true) or ValkeyPubSub
 * - Depends on ValkeyModule for ValkeyService (used by ValkeyPubSub)
 * - ConfigService is globally available from ConfigModule in AppModule
 */
@Global()
@Module({
  imports: [ValkeyModule],
  providers: [
    LocalPubSub,
    {
      provide: PUB_SUB,
      useFactory: (
        configService: ConfigService<Configuration, true>,
        valkeyService: ValkeyService,
        localPubSub: LocalPubSub
      ): ValkeyPubSub | LocalPubSub => {
        const isOffline = configService.get("app.isOffline", { infer: true });
        return isOffline ? localPubSub : new ValkeyPubSub(valkeyService);
      },
      inject: [ConfigService, ValkeyService, LocalPubSub],
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
