import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  INTEREST,
  type InterestName,
} from '../../common/constants/interests.js';
import { ROLE, type RoleName } from '../../common/constants/roles.js';
import { toLowerTrimmed, trimmed } from '../../common/utils/transform.util.js';

export class CreateUserDto {
  @ApiProperty({ example: 'maya_rodriguez' })
  @Transform(toLowerTrimmed)
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @Matches(/^[a-z0-9_-]{3,30}$/, {
    message:
      'Username must be 3 to 30 characters and use only letters, numbers, _ or -',
  })
  userName: string;

  @ApiProperty({ example: 'Maya Rodriguez' })
  @Transform(trimmed)
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(100, { message: 'Full name must be at most 100 characters' })
  fullName: string;

  @ApiProperty({ example: 'maya.rodriguez@example.com' })
  @Transform(toLowerTrimmed)
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(254, { message: 'Email must be at most 254 characters' })
  email: string;

  @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  @ApiProperty({ enum: Object.values(ROLE), example: ROLE.USER })
  @IsNotEmpty({ message: 'Role is required' })
  @IsIn(Object.values(ROLE), {
    message: `Role must be one of: ${Object.values(ROLE).join(', ')}`,
  })
  role: RoleName;

  @ApiPropertyOptional({
    enum: Object.values(INTEREST),
    isArray: true,
    example: [INTEREST.MUSIC, INTEREST.TRAVEL],
  })
  @IsOptional()
  @IsArray({ message: 'Interests must be a list' })
  @ArrayUnique({ message: 'Interests must not repeat' })
  @IsIn(Object.values(INTEREST), {
    each: true,
    message: `Each interest must be one of: ${Object.values(INTEREST).join(', ')}`,
  })
  interests?: InterestName[];
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}

export class UsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(ROLE) })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsIn(Object.values(ROLE), {
    message: `Role must be one of: ${Object.values(ROLE).join(', ')}`,
  })
  role?: RoleName;

  @ApiPropertyOptional({ enum: Object.values(INTEREST) })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsIn(Object.values(INTEREST), {
    message: `Interest must be one of: ${Object.values(INTEREST).join(', ')}`,
  })
  interest?: InterestName;

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
}

export class UsersByInterestQueryDto {
  @ApiPropertyOptional({ enum: Object.values(INTEREST) })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsIn(Object.values(INTEREST), {
    message: `Interest must be one of: ${Object.values(INTEREST).join(', ')}`,
  })
  interest?: InterestName;

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
}
