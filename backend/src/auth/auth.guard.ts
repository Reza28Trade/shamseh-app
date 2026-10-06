import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = request.cookies?.[AUTH_COOKIE_NAME];

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authService.validateSession(sessionToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as Request & { user: AuthenticatedUser }).user = user;
    return true;
  }
}
