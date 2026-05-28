/**
 * @file hello.module.ts
 * @description NestJS module for hello world functionality
 * @module hello
 */

import { Module } from "@nestjs/common";
import { HelloService } from "./hello.service";
import { HelloResolver } from "./hello.resolver";
import { HelloSubscriptionResolver } from "./hello-subscription.resolver";

/**
 * Module encapsulating hello world functionality
 * @description Provides HelloService, HelloResolver, and HelloSubscriptionResolver
 */
@Module({
  providers: [HelloService, HelloResolver, HelloSubscriptionResolver],
  exports: [HelloService],
})
export class HelloModule {}
