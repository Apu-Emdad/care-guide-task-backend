import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggerModule } from './common/error-logger/error-logger.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ErrorMessageInterceptor } from './common/interceptors/error-message.interceptor.js';
import { validateEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { MongoModule } from './infra/mongo/mongo.module.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TokenModule } from './infra/token/token.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    MongoModule,
    TokenModule,
    PrismaModule,
    ErrorLoggerModule,
    AuthModule,
    UsersModule,
    ProfileModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: AuthGuard sets request.user, RolesGuard reads it.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Passes the route's @ErrorMessage to HttpExceptionFilter.
    { provide: APP_INTERCEPTOR, useClass: ErrorMessageInterceptor },
    // Sends every error that escapes a request in the Result shape.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
