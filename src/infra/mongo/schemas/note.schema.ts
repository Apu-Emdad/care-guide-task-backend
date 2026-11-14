import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

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
