import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Env } from '../../config/env.js';

/**
 * MongoDB connection
 *
 * Connects to MongoDB Atlas with Mongoose when the app starts. The
 * connection string comes from MONGODB_URI. If MongoDB can't be reached,
 * the connection fails after the timeout and the app exits with an error.
 * Mongoose is global, so feature modules only need
 * `MongooseModule.forFeature` for their own schemas.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        serverSelectionTimeoutMS: 10_000,
        // No retries: fail on the first error instead of waiting about 30 s
        retryAttempts: 0,
      }),
    }),
  ],
})
export class MongoModule {}
