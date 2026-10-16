import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && !(user.role === 'STAFF' && user.permissions.includes('logs'))) {
      throw new ForbiddenException('You are not allowed to view system audit logs');
    }

    const rows = await this.prisma.auditLog.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { username: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      performedBy: row.actor?.username ?? 'کاربر عمومی / ناشناس',
      details: row.metadata ?? null,
      timestamp: row.createdAt.toISOString(),
      ipAddress: row.ipAddress,
    }));
  }
}
