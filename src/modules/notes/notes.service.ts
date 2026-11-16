import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type QueryFilter } from 'mongoose';
import type { Result } from '../../common/interfaces/result.interface.js';
import { escapeRegex } from '../../common/utils/escape-regex.util.js';
import { Note } from '../../infra/mongo/schemas/note.schema.js';
import type { User } from '../../common/types/auth.types.js';
import type {
  CreateNoteDto,
  NotesQueryDto,
  UpdateNoteDto,
} from './notes.dto.js';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private readonly notes: Model<Note>) {}

  async create(issuer: User, dto: CreateNoteDto): Promise<Result> {
    const note = await this.notes.create({
      title: dto.title,
      content: dto.content,
      author: issuer.id,
    });

    return {
      status: HttpStatus.CREATED,
      message: 'Note created successfully',
      data: note,
    };
  }

  async getNotes(issuer: User, query: NotesQueryDto): Promise<Result> {
    const filter: QueryFilter<Note> = { author: issuer.id };

    if (query.search) {
      const search = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [{ title: search }, { content: search }];
    }

    const [total, notes] = await Promise.all([
      this.notes.countDocuments(filter),
      this.notes
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize),
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Notes fetched successfully',
      data: { total, notes },
    };
  }

  async getAllNotes(query: NotesQueryDto): Promise<Result> {
    const filter: QueryFilter<Note> = {};

    if (query.search) {
      const search = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [{ title: search }, { content: search }];
    }

    const [total, notes] = await Promise.all([
      this.notes.countDocuments(filter),
      this.notes
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .populate('author', 'userName fullName email'),
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Notes fetched successfully',
      data: { total, notes },
    };
  }

  async getNote(issuer: User, id: string): Promise<Result> {
    const note = await this.notes.findOne({ _id: id, author: issuer.id });
    if (!note) throw new NotFoundException('Note not found');

    return {
      status: HttpStatus.OK,
      message: 'Note fetched successfully',
      data: note,
    };
  }

  async updateNote(
    issuer: User,
    id: string,
    dto: UpdateNoteDto,
  ): Promise<Result> {
    const note = await this.notes.findOneAndUpdate(
      { _id: id, author: issuer.id },
      dto,
      { returnDocument: 'after', runValidators: true },
    );
    if (!note) throw new NotFoundException('Note not found');

    return {
      status: HttpStatus.OK,
      message: 'Note updated successfully',
      data: note,
    };
  }

  async deleteNote(issuer: User, id: string): Promise<Result> {
    const note = await this.notes.findOneAndDelete({
      _id: id,
      author: issuer.id,
    });
    if (!note) throw new NotFoundException('Note not found');

    return { status: HttpStatus.OK, message: 'Note deleted successfully' };
  }
}
