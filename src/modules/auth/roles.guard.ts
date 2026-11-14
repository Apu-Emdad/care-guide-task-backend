import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';

/**
 * Roles guard
 *
 * Global guard that runs after AuthGuard. It enforces @Roles(...) where it is set.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Roles allowed on this route. A method's @Roles wins over the controller's.
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // No @Roles on the route: nothing to check
    if (!roles?.length) return true;

    // request.user is set by AuthGuard from the JWT
    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) throw new UnauthorizedException('Missing access token');
    // The user's role is not one of the allowed roles
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
