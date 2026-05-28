/**
 * @file message.type.ts
 * @description GraphQL object type for simple message responses
 * @module auth/types
 */
import { Field, ObjectType } from "@nestjs/graphql";

/**
 * Simple message response
 * @description Used for operations that return only a confirmation message
 */
@ObjectType({ description: "Simple message response" })
export class Message {
  /**
   * The message content
   */
  @Field(() => String, { description: "The message content" })
  message: string;
}
