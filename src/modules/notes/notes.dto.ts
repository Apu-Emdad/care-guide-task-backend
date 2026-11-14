import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateNoteDto {
  @ApiProperty({ example: 'Shopping list' })
  @Transform(trimmed)
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title: string;

  @ApiProperty({ example: 'Milk, eggs, bread' })
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(10000, { message: 'Content must be at most 10000 characters' })
  content: string;
}

/** Same rules as CreateNoteDto, but every field is optional. */
export class UpdateNoteDto extends PartialType(CreateNoteDto) {}

/** Query params of the notes list: `?page=1&pageSize=10&search=milk`. */
export class NotesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be a whole number' })
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be a whole number' })
  pageSize: number = 10;

  @ApiPropertyOptional({ example: 'milk' })
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'Search must be a string' })
  search: string = '';
}
