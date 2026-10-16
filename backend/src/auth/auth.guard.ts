import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
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

    const path = (request.originalUrl || request.url).split('?')[0].replace(/^\/api\//, '/');
    if (user.role === 'STAFF' && path.startsWith('/admin/') && path !== '/admin/account/password') {
      const permission = this.permissionForPath(path);
      if (!permission || !user.permissions.includes(permission)) {
        throw new ForbiddenException('This admin section is not assigned to your account');
      }
    }

    (request as Request & { user: AuthenticatedUser }).user = user;
    return true;
  }

  private permissionForPath(path: string): string | null {
    if (/^\/admin\/(support\/tickets|messages)(\/|$)/.test(path)) return 'messages';
    if (/^\/admin\/(courses|course-enrollments|sessions|files)(\/|$)/.test(path)) return 'courses';
    if (/^\/admin\/(students|enrollments)(\/|$)/.test(path)) return 'students';
    if (/^\/admin\/(notifications|mock-exams\/.*participants)(\/|$)/.test(path)) return 'notifications';
    if (/^\/admin\/offline-requests(\/|$)/.test(path)) return 'offlineRequests';
    if (/^\/admin\/mock-exams(\/|$)/.test(path)) return 'mockExams';
    if (/^\/admin\/counseling(\/|$)/.test(path)) return 'counseling';
    if (/^\/admin\/(public-content|general-content|rules)(\/|$)/.test(path)) return 'rules';
    if (/^\/admin\/(registrations|registration-payments|registration-receipts|refunds)(\/|$)/.test(path)) return 'finance';
    if (/^\/admin\/finance(\/|$)/.test(path)) return 'finance';
    if (/^\/admin\/(audit-logs|logs)(\/|$)/.test(path)) return 'logs';
    return null;
  }
}
