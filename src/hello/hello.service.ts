/**
 * @file hello.service.ts
 * @description Service providing hello world functionality
 * @module hello
 */

import { Injectable } from "@nestjs/common";

/**
 * Service for greeting operations
 * @description Provides greeting functionality for Hello World demonstration
 */
@Injectable()
export class HelloService {
  /**
   * Returns the classic Hello World greeting
   * @returns The greeting string "Hello World"
   */
  getHello(): string {
    return "Hello World";
  }

  /**
   * Returns a personalized greeting
   * @param name - The name to include in the greeting
   * @returns A personalized greeting in format "Hello, {name}!"
   */
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  /**
   * Batch loads greetings for multiple names (for DataLoader)
   * @param names - Array of names to greet
   * @returns Promise resolving to array of greetings in same order as input
   * @remarks Used by DataLoader for batching - maintains input order
   */
  async getGreetingsByBatch(names: readonly string[]): Promise<string[]> {
    return names.map(name => this.greet(name));
  }
}
