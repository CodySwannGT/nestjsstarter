/**
 * @file data-loader.service.ts
 * @description Service that creates DataLoader instances for each GraphQL request
 * @module data-loader
 */

import { Injectable } from "@nestjs/common";
import DataLoader from "dataloader";
import { HelloService } from "../hello/hello.service";
import { IDataLoaders } from "./data-loader.interface";

/**
 * Service for creating DataLoader instances
 * @description Creates fresh DataLoader instances per request for N+1 prevention
 * @remarks
 * - Call getLoaders() once per GraphQL request in context factory
 * - Each loader batches and caches within the request scope
 * - Add new loader creation methods as features grow
 */
@Injectable()
export class DataLoaderService {
  /**
   * Creates a DataLoaderService instance
   * @param helloService - Service for hello operations
   */
  constructor(private readonly helloService: HelloService) {}

  /**
   * Creates all DataLoader instances for a single request
   * @returns Object containing all typed DataLoaders
   * @remarks Called in GraphQL context factory - creates fresh instances per request
   */
  getLoaders(): IDataLoaders {
    return {
      greetingsLoader: this.createGreetingsLoader(),
    };
  }

  /**
   * Creates a DataLoader for batch loading greetings
   * @returns DataLoader that batches greeting requests by name
   */
  private createGreetingsLoader(): DataLoader<string, string> {
    return new DataLoader<string, string>(async (names: readonly string[]) =>
      this.helloService.getGreetingsByBatch([...names])
    );
  }
}
