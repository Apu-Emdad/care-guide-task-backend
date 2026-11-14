import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * refresh_tokens collection
 *
 * One document per session. `_id` is the session id and goes inside the refresh token,
 * so a token is found by `_id` (the default index).
 *
 * Indexes:
 * - TTL on `expiresAt`: MongoDB deletes a session once it expires (the check runs about
 *   once a minute, so the code must still compare `expiresAt` itself).
 * - `userId`: ends all sessions of a user (password change, user delete, token reuse).
 */
@Schema({
  collection: 'refresh_tokens',
  timestamps: { createdAt: true, updatedAt: false },
})
export class RefreshToken {
  /** The session id. */
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** SHA-256 hash of the refresh token. The token itself is never stored. */
  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1 });
