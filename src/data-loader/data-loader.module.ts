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
