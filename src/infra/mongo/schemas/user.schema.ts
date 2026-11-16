import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import {
  INTEREST,
  type InterestName,
} from '../../../common/constants/interests.js';

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, required: true, trim: true, lowercase: true })
  userName: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, required: true, enum: USER_ROLES, default: 'USER' })
  role: UserRole;

  @Prop({ type: [String], enum: Object.values(INTEREST), default: [] })
  interests: InterestName[];

  createdAt: Date;

  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ userName: 1 }, { unique: true });
UserSchema.index({ interests: 1, _id: -1 });
