import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Roles a user can have. */
export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * users collection
 *
 * Index: unique `email`, used by login and by the duplicate email check.
 * Lists sort by `_id` and single reads use `_id`, so they need no index.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  /** Hidden from queries by default. Ask for it with `.select('+passwordHash')`. */
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, enum: USER_ROLES, default: 'USER' })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
