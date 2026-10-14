import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RegistrationApprovalMode } from '@prisma/client';

/** Add one calendar month while clamping month-end dates (e.g. Jan 31 -> Feb 28/29).
 * UTC calendar operations keep date-only values stable across server time zones.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())
    || !Number.isInteger(months) || months < 0) {
    throw new BadRequestException('تاریخ یا تعداد ماه‌های سررسید معتبر نیست.');
  }
  const day = date.getUTCDate();
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear, normalizedMonth, Math.min(day, lastDay),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds(),
  ));
}

export function addOneMonthClamped(date: Date): Date {
  return addMonthsClamped(date, 1);
}

export interface RegistrationApprovalPlanInput {
  mode: RegistrationApprovalMode;
  actorRole: string;
  originalTuition: number;
  discountAmount: number;
  discountReason?: string;
  exceptionReason?: string;
  approvedAmount: number;
  previouslyApprovedAmount?: number;
  firstDueDate: string | Date;
  now?: Date;
}

export interface RegistrationApprovalPlan {
  finalTuition: number;
  totalPaid: number;
  ratio: number;
  remaining: number;
  installmentAmounts: number[];
  firstDueDate: Date;
}

/** Pure business-rule calculation shared by approval logic and regression tests. */
export function calculateRegistrationApprovalPlan(input: RegistrationApprovalPlanInput): RegistrationApprovalPlan {
  const discount = input.discountAmount;
  const originalTuition = input.originalTuition;
  const approvedAmount = input.approvedAmount;
  const previouslyApprovedAmount = input.previouslyApprovedAmount ?? 0;

  if (!Number.isFinite(originalTuition) || originalTuition <= 0) {
    throw new BadRequestException('شهریه اولیه باید بیشتر از صفر باشد.');
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > originalTuition) {
    throw new BadRequestException('مبلغ تخفیف معتبر نیست.');
  }
  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0
    || !Number.isFinite(previouslyApprovedAmount) || previouslyApprovedAmount < 0) {
    throw new BadRequestException('مبلغ تأییدشده معتبر نیست.');
  }

  if (input.mode === RegistrationApprovalMode.NORMAL && discount !== 0) {
    throw new BadRequestException('در حالت عادی تخفیف مجاز نیست.');
  }
  if (input.mode === RegistrationApprovalMode.DISCOUNT && (discount <= 0 || !input.discountReason?.trim())) {
    throw new BadRequestException('برای حالت تخفیف، مبلغ و علت تخفیف الزامی است.');
  }
  if (input.mode === RegistrationApprovalMode.PAYMENT_EXCEPTION) {
    if (discount !== 0 || !input.exceptionReason?.trim()) {
      throw new BadRequestException('استثنای پرداخت بدون تخفیف و با علت مستند مجاز است.');
    }
    if (input.actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('تأیید استثنای پرداخت فقط با مجوز مدیر ارشد انجام می‌شود.');
    }
  }

  const finalTuition = originalTuition - discount;
  if (!Number.isFinite(finalTuition) || finalTuition <= 0) {
    throw new BadRequestException('شهریه نهایی باید بیشتر از صفر باشد.');
  }
  const totalPaid = previouslyApprovedAmount + approvedAmount;
  const ratio = totalPaid / finalTuition;

  if (input.mode === RegistrationApprovalMode.NORMAL && ratio < 0.6) {
    throw new BadRequestException('پیش‌پرداخت در حالت عادی باید حداقل ۶۰٪ باشد.');
  }
  if (input.mode === RegistrationApprovalMode.DISCOUNT && ratio < 0.6) {
    throw new BadRequestException('پس از تخفیف نیز پیش‌پرداخت باید حداقل ۶۰٪ شهریه نهایی باشد.');
  }
  if (input.mode === RegistrationApprovalMode.PAYMENT_EXCEPTION && ratio >= 0.6) {
    throw new BadRequestException('حالت استثنا فقط برای پرداخت کمتر از ۶۰٪ است.');
  }

  const firstDueDate = new Date(input.firstDueDate instanceof Date ? input.firstDueDate.getTime() : input.firstDueDate);
  if (Number.isNaN(firstDueDate.getTime())) throw new BadRequestException('تاریخ سررسید معتبر نیست.');
  // Tuition and payment amounts are currency values; normalize the remaining
  // balance to cents before deriving installment amounts.
  const remaining = Math.round(Math.max(0, finalTuition - totalPaid) * 100) / 100;
  const now = input.now ?? new Date();
  // HTML date inputs submit YYYY-MM-DD. Compare those as calendar dates so "today"
  // is valid even though JavaScript parses it as midnight and the current time is later.
  const isDateOnly = typeof input.firstDueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.firstDueDate);
  const dueDay = isDateOnly
    ? Date.UTC(firstDueDate.getUTCFullYear(), firstDueDate.getUTCMonth(), firstDueDate.getUTCDate())
    : firstDueDate.getTime();
  const nowDay = isDateOnly
    ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    : now.getTime();
  if (remaining > 0 && dueDay < nowDay) {
    throw new BadRequestException('تاریخ اولین قسط نباید در گذشته باشد.');
  }

  let installmentAmounts: number[] = [];
  if (remaining > 0) {
    if (input.mode === RegistrationApprovalMode.PAYMENT_EXCEPTION || ratio < 0.8) {
      const first = Math.floor((remaining / 2) * 100) / 100;
      const second = Math.round((remaining - first) * 100) / 100;
      // A one-cent balance cannot be split into two positive installments.
      installmentAmounts = first > 0 && second > 0 ? [first, second] : [remaining];
    } else {
      installmentAmounts = [remaining];
    }
  }

  return { finalTuition, totalPaid, ratio, remaining, installmentAmounts, firstDueDate };
}

export interface RefundBalanceInput {
  totalApprovedPayments: number;
  totalTuition: number;
  alreadyReserved: number;
}

/** Whether a timestamp falls before today's UTC calendar-day boundary. */
export function isInstallmentPastDue(dueDate: Date, now: Date = new Date()): boolean {
  if (!(dueDate instanceof Date) || Number.isNaN(dueDate.getTime())
    || !(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BadRequestException('تاریخ سررسید قسط معتبر نیست.');
  }
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return dueDate.getTime() < todayStart;
}

export interface InstallmentReminderWindows {
  todayStart: Date;
  dueSoonStart: Date;
  dueSoonEnd: Date;
  overdueRepeatBefore: Date;
}

/** UTC calendar-day windows for reminder scheduling; a due date is not overdue during its own day. */
export function getInstallmentReminderWindows(now: Date): InstallmentReminderWindows {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BadRequestException('تاریخ اجرای یادآوری معتبر نیست.');
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    todayStart,
    dueSoonStart: new Date(todayStart.getTime() + 3 * dayMs),
    dueSoonEnd: new Date(todayStart.getTime() + 4 * dayMs),
    overdueRepeatBefore: new Date(now.getTime() - 3 * dayMs),
  };
}

/** Available refund balance after all approved tuition obligations and prior reservations. */
export function calculateRefundAvailableBalance(input: RefundBalanceInput): number {
  const values = [input.totalApprovedPayments, input.totalTuition, input.alreadyReserved];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new BadRequestException('مقادیر محاسبهٔ موجودی بازپرداخت معتبر نیستند.');
  }
  const available = input.totalApprovedPayments - input.totalTuition - input.alreadyReserved;
  return Math.round(Math.max(0, available) * 100) / 100;
}

export interface OutstandingInstallment {
  id: string;
  dueDate: Date;
  amount: number;
  allocated: number;
  sequence?: number;
}

export interface InstallmentAllocationPlan {
  installmentId: string;
  amount: number;
}

/** Allocate a payment to the oldest outstanding installments without exceeding any balance. */
export function planOldestDebtAllocations(
  installments: OutstandingInstallment[],
  paymentAmount: number,
): InstallmentAllocationPlan[] {
  if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
    throw new BadRequestException('مبلغ تخصیص پرداخت معتبر نیست.');
  }
  for (const item of installments) {
    if (!Number.isFinite(item.amount) || item.amount < 0
      || !Number.isFinite(item.allocated) || item.allocated < 0
      || item.allocated > item.amount + 0.0001
      || !(item.dueDate instanceof Date) || Number.isNaN(item.dueDate.getTime())) {
      throw new BadRequestException('اطلاعات قسط برای تخصیص پرداخت معتبر نیست.');
    }
  }
  let left = Math.round(paymentAmount * 100) / 100;
  const plan: InstallmentAllocationPlan[] = [];
  const ordered = [...installments].sort((a, b) =>
    a.dueDate.getTime() - b.dueDate.getTime()
    || (a.sequence ?? 0) - (b.sequence ?? 0)
    || a.id.localeCompare(b.id));
  for (const item of ordered) {
    if (left <= 0.0001) break;
    const balance = Math.max(0, Math.round((item.amount - item.allocated) * 100) / 100);
    if (balance <= 0.0001) continue;
    const amount = Math.round(Math.min(left, balance) * 100) / 100;
    if (amount <= 0) continue;
    plan.push({ installmentId: item.id, amount });
    left = Math.round((left - amount) * 100) / 100;
  }
  // A caller may intentionally allocate only the part that covers older debts;
  // any remainder remains available for the caller's overpayment/refund policy.
  return plan;
}
