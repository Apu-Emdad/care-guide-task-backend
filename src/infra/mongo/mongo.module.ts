import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Env } from '../../config/env.js';
import { NoteSchema, Note } from './schemas/note.schema.js';
import { Post, PostSchema } from './schemas/post.schema.js';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema.js';
import { User, UserSchema } from './schemas/user.schema.js';

/** Every collection of the app. Feature modules inject these models with `@InjectModel`. */
const models = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: RefreshToken.name, schema: RefreshTokenSchema },
  { name: Note.name, schema: NoteSchema },
  { name: Post.name, schema: PostSchema },
]);

/**
 * MongoDB connection
 *
 * Connects to MongoDB Atlas with Mongoose when the app starts. The
 * connection string comes from MONGODB_URI. If MongoDB can't be reached,
 * the connection fails after the timeout and the app exits with an error.
 *
 * The module is global and exports the models, so a feature module can
 * inject any model without importing anything.
 */
@Global()
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
    models,
  ],
  exports: [models],
})
export class MongoModule {}
