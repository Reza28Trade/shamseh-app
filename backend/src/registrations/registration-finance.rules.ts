import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RegistrationApprovalMode } from '@prisma/client';

/** Add one calendar month while clamping month-end dates (e.g. Jan 31 -> Feb 28/29).
 * UTC calendar operations keep date-only values stable across server time zones.
 */
export function addOneMonthClamped(date: Date): Date {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
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
  const remaining = Math.max(0, finalTuition - totalPaid);
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
      installmentAmounts = [first, Math.round((remaining - first) * 100) / 100];
    } else {
      installmentAmounts = [Math.round(remaining * 100) / 100];
    }
  }

  return { finalTuition, totalPaid, ratio, remaining, installmentAmounts, firstDueDate };
}

export interface RefundBalanceInput {
  totalApprovedPayments: number;
  totalTuition: number;
  alreadyReserved: number;
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
