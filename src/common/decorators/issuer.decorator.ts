import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../../modules/auth/auth.types.js';

// The logged-in user from the access token, or undefined on a public route without a valid token.
export const Issuer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | undefined =>
    ctx.switchToHttp().getRequest<Request>().user,
);
