import { Injectable, UnauthorizedException } from '@nestjs/common';
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
        student: { select: { id: true, fullName: true, nationalId: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, password))) {
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
            student: { select: { id: true, fullName: true, nationalId: true } },
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
      studentId: session.user.student?.id ?? null,
      student: session.user.student ? { fullName: session.user.student.fullName, nationalId: session.user.student.nationalId } : null,
      sessionToken,
    };
  }

  async logout(sessionToken: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(sessionToken) },
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: {
    id: string;
    username: string;
    role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
    student: { id: string; fullName: string; nationalId: string } | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      studentId: user.student?.id ?? null,
      student: user.student ? { fullName: user.student.fullName, nationalId: user.student.nationalId } : null,
    };
  }
}
