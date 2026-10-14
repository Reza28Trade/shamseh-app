import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

type AuditRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<AuditRequest>();
    const response = http.getResponse<Response>();
    const method = request.method.toUpperCase();
    const operationStartedAt = new Date();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const rawPath = (request.originalUrl || request.url).split('?')[0];
    const path = rawPath.replace(/^\/api(?=\/)/, '');
    // The audit viewer itself and authentication/session endpoints are not business mutations.
    if (
      /^\/admin\/(audit-logs|logs)(\/|$)/.test(path) ||
      /^\/auth\/(login|logout|me|session)(\/|$)/.test(path)
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (result) => {
        // Only successful responses are recorded. Do not log request bodies: they may contain
        // passwords, payment data, private messages, or other sensitive student information.
        if (response.statusCode >= 200 && response.statusCode < 400) {
          const actor = request.user;
          const route = this.normalizedRoute(request, path);
          const segments = route.split('/').filter(Boolean);
          const entityType = this.entityType(segments);
          const routeParams = request.params && Object.keys(request.params).length
            ? Object.fromEntries(
                Object.entries(request.params).filter(([key, value]) =>
                  /(^id$|Id$|^studentId$|^courseId$|^registrationId$|^paymentId$|^refundId$)/i.test(key)
                  && typeof value === 'string'
                  && value.length <= 128,
                ),
              )
            : undefined;

          try {
            // Some finance workflows already write a richer domain-specific audit event
            // inside their transaction. Avoid adding a second generic row for that same entity.
            const entityId = this.entityId(routeParams);
            if (actor?.id && entityId) {
              const existingDomainEvent = await this.prisma.auditLog.findFirst({
                where: {
                  actorUserId: actor.id,
                  entityId,
                  createdAt: { gte: operationStartedAt },
                },
                select: { id: true },
              });
              if (existingDomainEvent) return result;
            }
            await this.prisma.auditLog.create({
              data: {
                actorUserId: actor?.id ?? null,
                action: `${method} ${route}`.slice(0, 191),
                entityType,
                entityId,
                metadata: {
                  method,
                  route,
                  statusCode: response.statusCode,
                  actorRole: actor?.role ?? 'ANONYMOUS',
                  ...(routeParams ? { routeParams } : {}),
                },
                ipAddress: request.ip?.slice(0, 64) ?? null,
              },
            });
          } catch (error) {
            // Auditing must never turn a successful business operation into a failed response.
            console.error('[AuditLog] Could not persist mutation event', error);
          }
        }
        return result;
      }),
    );
  }

  private normalizedRoute(request: AuditRequest, fallbackPath: string): string {
    const routePath = request.route?.path;
    const baseUrl = request.baseUrl || '';
    const fullRoute = typeof routePath === 'string' ? `${baseUrl}${routePath}` : fallbackPath;
    return fullRoute.replace(/^\/api(?=\/)/, '').slice(0, 500) || '/';
  }

  private entityType(segments: string[]): string {
    const first = segments[0]?.toLowerCase();
    const second = segments[1]?.toLowerCase();
    const resource = ['admin', 'student', 'students', 'counselor', 'public'].includes(first)
      ? (second || first)
      : (first || 'application');
    return resource.replace(/[^a-z0-9_-]/g, '').slice(0, 100) || 'application';
  }

  private entityId(params?: Record<string, unknown>): string | null {
    if (!params) return null;
    const value = Object.entries(params).find(([key, item]) =>
      /(^id$|Id$|^studentId$|^courseId$|^registrationId$|^paymentId$|^refundId$)/i.test(key)
      && typeof item === 'string'
      && item.length <= 128,
    )?.[1];
    return typeof value === 'string' ? value : null;
  }
}
