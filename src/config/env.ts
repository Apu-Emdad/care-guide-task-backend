import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  validateSync,
} from 'class-validator';

export class Env {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsInt()
  @IsPositive()
  PORT: number = 5000;

  // MongoDB Atlas connection string, with the database name at the end
  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message:
      'MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string',
  })
  MONGODB_URI: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  // Seconds until an access token expires
  @IsInt()
  @IsPositive()
  JWT_ACCESS_EXPIRES_IN: number = 900;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  // Seconds until a refresh token expires
  @IsInt()
  @IsPositive()
  JWT_REFRESH_EXPIRES_IN: number = 604800;

  // Origin of the web app, allowed by CORS to send the refresh cookie
  @IsUrl({ require_tld: false })
  WEB_ORIGIN: string = 'http://localhost:5001';
}

// Used by ConfigModule: throws on startup when a variable is missing or invalid.
export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    const problems = errors
      .map(
        (error) =>
          `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  return env;
}
