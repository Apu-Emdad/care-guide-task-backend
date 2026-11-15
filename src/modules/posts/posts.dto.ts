import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimmed } from '../../common/utils/transform.util.js';

export class CreatePostDto {
  @ApiProperty({ example: 'My first post' })
  @Transform(trimmed)
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title: string;

  @ApiProperty({ example: 'Hello everyone!' })
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(10000, { message: 'Content must be at most 10000 characters' })
  content: string;
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class PostsQueryDto {
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

  @ApiPropertyOptional({ example: 'hello' })
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'Search must be a string' })
  search: string = '';
}
