import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import type { User } from '../../common/types/auth.types.js';
import { CreateNoteDto, NotesQueryDto, UpdateNoteDto } from './notes.dto.js';
import { NotesService } from './notes.service.js';

@ApiBearerAuth()
@ApiTags('Notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  async createNote(
    @Issuer() issuer: User,
    @Body() dto: CreateNoteDto,
    @Res() res: Response,
  ) {
    const result = await this.notesService.create(issuer, dto);
    res.status(result.status).json(result);
  }

  @Get()
  async getNotes(
    @Issuer() issuer: User,
    @Query() query: NotesQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.notesService.getNotes(issuer, query);
    res.status(result.status).json(result);
  }

  @Get(':id')
  async getNote(
    @Issuer() issuer: User,
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.notesService.getNote(issuer, id);
    res.status(result.status).json(result);
  }

  @Patch(':id')
  async updateNote(
    @Issuer() issuer: User,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateNoteDto,
    @Res() res: Response,
  ) {
    const result = await this.notesService.updateNote(issuer, id, dto);
    res.status(result.status).json(result);
  }

  @Delete(':id')
  async deleteNote(
    @Issuer() issuer: User,
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.notesService.deleteNote(issuer, id);
    res.status(result.status).json(result);
  }
}
