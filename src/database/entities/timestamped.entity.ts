/**
 * @file timestamped.entity.ts
 * @description Abstract base entity providing common timestamp fields for all entities
 * @module database/entities
 */
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Abstract base entity providing common timestamp fields.
 * @description All concrete entities should extend this class to inherit
 * standard id, createdAt, and updatedAt fields with consistent column comments.
 * @abstract
 * @remarks
 * - Does NOT have @Entity() decorator - only concrete child entities get this
 * - Uses UUID for primary keys
 * - Timestamps are automatically managed by TypeORM
 */
export abstract class TimestampedEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "Unique identifier (UUID v4)" })
  id: string;

  @CreateDateColumn({ comment: "Timestamp when record was created" })
  createdAt: Date;

  @UpdateDateColumn({ comment: "Timestamp when record was last updated" })
  updatedAt: Date;
}
