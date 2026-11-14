import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * notes collection
 *
 * Index: `{ owner, _id: -1 }`. It lists a user's notes newest first and also covers the
 * owner check on a single note. The admin list of all notes sorts by `_id`, which is
 * already indexed, so it needs no index of its own.
 */
@Schema({ collection: 'notes', timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, maxlength: 10000 })
  content: string;
}

export type NoteDocument = HydratedDocument<Note>;

export const NoteSchema = SchemaFactory.createForClass(Note);

NoteSchema.index({ owner: 1, _id: -1 });
