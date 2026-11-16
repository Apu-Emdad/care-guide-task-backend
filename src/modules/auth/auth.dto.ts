import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { toLowerTrimmed, trimmed } from '../../common/utils/transform.util.js';

export class RegisterDto {
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
}

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @Transform(toLowerTrimmed)
  @IsString({ message: 'Username or email must be a string' })
  @IsNotEmpty({ message: 'Username or email is required' })
  @MaxLength(254, {
    message: 'Username or email must be at most 254 characters',
  })
  userNameOrEmail: string;

  @ApiProperty({ example: '12345678' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;
}
