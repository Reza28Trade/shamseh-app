import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { SESSION_TTL_DAYS } from './auth.constants';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        status: true,
        permissions: true,
        student: { select: { id: true, fullName: true, nationalId: true, isArchived: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE' || (user.role === 'STUDENT' && user.student?.isArchived) || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      sessionToken,
      maxAgeMs: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
      user: this.publicUser(user),
    };
  }

  async validateSession(sessionToken: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(sessionToken) },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
            permissions: true,
            student: { select: { id: true, fullName: true, nationalId: true } },
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE' || (session.user.role === 'STUDENT' && session.user.student?.isArchived)) {
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
      studentId: session.user.student?.id ?? null,
      permissions: session.user.role === 'SUPER_ADMIN' ? ['*'] : session.user.permissions,
      student: session.user.student ? { fullName: session.user.student.fullName, nationalId: session.user.student.nationalId } : null,
      sessionToken,
    };
  }

  async logout(sessionToken: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(sessionToken) },
    });
  }


  async listAdmins(actor: AuthenticatedUser) {
    this.requireSuperAdmin(actor);
    return this.prisma.user.findMany({
      where: { role: 'STAFF' },
      select: { id: true, username: true, status: true, permissions: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(actor: AuthenticatedUser, body: { username: string; password: string; permissions?: string[] }) {
    this.requireSuperAdmin(actor);
    const username = String(body.username || '').trim();
    if (username.length < 3 || username.length > 80) throw new BadRequestException('Username must be 3–80 characters');
    if (typeof body.password !== 'string' || body.password.length < 12) throw new BadRequestException('Password must be at least 12 characters');
    const permissions = this.cleanPermissions(body.permissions ?? []);
    if (await this.prisma.user.findUnique({ where: { username }, select: { id: true } })) throw new BadRequestException('Username is already in use');
    return this.prisma.user.create({
      data: { username, passwordHash: await argon2.hash(body.password), role: 'STAFF', permissions },
      select: { id: true, username: true, status: true, permissions: true, createdAt: true, lastLoginAt: true },
    });
  }

  async updateAdmin(actor: AuthenticatedUser, id: string, body: { username?: string; password?: string; permissions?: string[]; status?: 'ACTIVE' | 'INACTIVE' }) {
    this.requireSuperAdmin(actor);
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing || existing.role !== 'STAFF') throw new NotFoundException('Admin account not found');
    const data: { username?: string; passwordHash?: string; permissions?: string[]; status?: 'ACTIVE' | 'INACTIVE' } = {};
    if (body.username !== undefined) {
      const username = String(body.username).trim();
      if (username.length < 3 || username.length > 80) throw new BadRequestException('Username must be 3–80 characters');
      const duplicate = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (duplicate && duplicate.id !== id) throw new BadRequestException('Username is already in use');
      data.username = username;
    }
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 12) throw new BadRequestException('Password must be at least 12 characters');
      data.passwordHash = await argon2.hash(body.password);
    }
    if (body.permissions !== undefined) data.permissions = this.cleanPermissions(body.permissions);
    if (body.status !== undefined) {
      if (body.status !== 'ACTIVE' && body.status !== 'INACTIVE') throw new BadRequestException('Invalid status');
      data.status = body.status;
    }
    const updated = await this.prisma.user.update({
      where: { id }, data,
      select: { id: true, username: true, status: true, permissions: true, createdAt: true, lastLoginAt: true },
    });
    if (data.status === 'INACTIVE' || data.passwordHash || data.permissions || data.username) await this.prisma.session.deleteMany({ where: { userId: id } });
    return updated;
  }

  async changeOwnPassword(actor: AuthenticatedUser, body: { currentPassword: string; newPassword: string }) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'STAFF') throw new ForbiddenException('Admin account required');
    if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string' || body.newPassword.length < 12) throw new BadRequestException('New password must be at least 12 characters');
    const account = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
    if (!account || !(await argon2.verify(account.passwordHash, body.currentPassword))) throw new BadRequestException('Current password is incorrect');
    await this.prisma.user.update({ where: { id: actor.id }, data: { passwordHash: await argon2.hash(body.newPassword) } });
    await this.prisma.session.deleteMany({ where: { userId: actor.id } });
    return { success: true };
  }

  private requireSuperAdmin(actor: AuthenticatedUser) {
    if (actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin access required');
  }

  private cleanPermissions(value: unknown): string[] {
    const allowed = ['courses', 'students', 'offlineRequests', 'mockExams', 'counseling', 'messages', 'notifications', 'rules', 'finance', 'logs'];
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) throw new BadRequestException('Invalid admin permissions');
    return [...new Set(value)];
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: {
    id: string;
    username: string;
    role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT' | 'COUNSELOR';
    student: { id: string; fullName: string; nationalId: string } | null;
    permissions: string[];
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.role === 'SUPER_ADMIN' ? ['*'] : user.permissions,
      studentId: user.student?.id ?? null,
      student: user.student ? { fullName: user.student.fullName, nationalId: user.student.nationalId } : null,
    };
  }
}
