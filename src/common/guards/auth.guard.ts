import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import { Model } from 'mongoose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { User } from '../../infra/mongo/schemas/user.schema.js';
import type { JwtPayload } from '../../infra/token/token.types.js';

/**
 * Global guard: every route needs a valid token unless it is marked @Public().
 * On public routes a valid token still sets request.user, and a missing or bad one
 * is ignored (no 401), so an expired token can't block /auth/refresh.
 * The user must still exist, so a deleted account is locked out right away instead of
 * when its access token expires. The role is read from the database, so a role change
 * also applies right away.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Missing access token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.users.findById(payload.sub).select('role').lean();
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('User no longer exists');
    }

    request.user = { id: payload.sub, role: user.role };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
