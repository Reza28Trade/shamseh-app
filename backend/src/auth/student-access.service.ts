import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface StudentFinanceRestriction {
  restricted: boolean;
  restrictedInstallments: Array<{ dueDate: Date; balance: number; daysOverdue: number }>;
}

/**
 * A student is restricted once an unpaid installment has remained outstanding
 * for at least ten complete calendar days after its due date.
 * Only approved allocations count as payment; pending receipts do not unlock access.
 */
@Injectable()
export class StudentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinanceRestriction(studentId: string): Promise<StudentFinanceRestriction> {
    const installments = await this.prisma.installment.findMany({
      where: { registration: { studentId, status: 'APPROVED' } },
      select: {
        dueDate: true,
        amount: true,
        allocations: {
          select: { amount: true, payment: { select: { status: true } } },
        },
      },
    });

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const lockAfterMs = 10 * 24 * 60 * 60 * 1000;
    const restrictedInstallments = installments.flatMap((installment) => {
      const paid = installment.allocations
        .filter((allocation) => allocation.payment.status === 'APPROVED')
        .reduce((sum, allocation) => sum + Number(allocation.amount), 0);
      const balance = Math.max(0, Number(installment.amount) - paid);
      const dueUtc = Date.UTC(
        installment.dueDate.getUTCFullYear(),
        installment.dueDate.getUTCMonth(),
        installment.dueDate.getUTCDate(),
      );
      const overdueMs = todayUtc - dueUtc;
      if (balance <= 0.0001 || overdueMs < lockAfterMs) return [];
      return [{
        dueDate: installment.dueDate,
        balance: Math.round(balance * 100) / 100,
        daysOverdue: Math.floor(overdueMs / (24 * 60 * 60 * 1000)),
      }];
    });

    return { restricted: restrictedInstallments.length > 0, restrictedInstallments };
  }
}
