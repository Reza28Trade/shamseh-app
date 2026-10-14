const assert = require('node:assert/strict');
const { RegistrationApprovalMode } = require('@prisma/client');
const { addOneMonthClamped, calculateRefundAvailableBalance, calculateRegistrationApprovalPlan, getInstallmentReminderWindows, planOldestDebtAllocations } = require('../dist/src/registrations/registration-finance.rules');

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

function plan(overrides = {}) {
  return calculateRegistrationApprovalPlan({
    mode: RegistrationApprovalMode.NORMAL,
    actorRole: 'STAFF',
    originalTuition: 100000,
    discountAmount: 0,
    approvedAmount: 60000,
    firstDueDate: future,
    ...overrides,
  });
}

const sixtyPercent = plan();
assert.equal(sixtyPercent.ratio, 0.6);
assert.equal(sixtyPercent.remaining, 40000);
assert.deepEqual(sixtyPercent.installmentAmounts, [20000, 20000]);

const eightyPercent = plan({ approvedAmount: 80000 });
assert.equal(eightyPercent.remaining, 20000);
assert.deepEqual(eightyPercent.installmentAmounts, [20000]);

const discounted = plan({
  mode: RegistrationApprovalMode.DISCOUNT,
  discountAmount: 20000,
  discountReason: 'تخفیف مدیریت',
  approvedAmount: 48000,
});
assert.equal(discounted.finalTuition, 80000);
assert.equal(discounted.ratio, 0.6);
assert.deepEqual(discounted.installmentAmounts, [16000, 16000]);

const exception = plan({
  mode: RegistrationApprovalMode.PAYMENT_EXCEPTION,
  actorRole: 'SUPER_ADMIN',
  approvedAmount: 50000,
  exceptionReason: 'استثنای مستند',
});
assert.deepEqual(exception.installmentAmounts, [25000, 25000]);

assert.throws(() => plan({ approvedAmount: 59999 }), /۶۰٪/);
assert.throws(() => plan({
  mode: RegistrationApprovalMode.DISCOUNT,
  discountAmount: 20000,
  discountReason: 'تخفیف',
  approvedAmount: 47999,
}), /۶۰٪/);
assert.throws(() => plan({
  mode: RegistrationApprovalMode.PAYMENT_EXCEPTION,
  actorRole: 'STAFF',
  approvedAmount: 50000,
  exceptionReason: 'استثنا',
}), /مدیر ارشد/);
assert.throws(() => plan({
  mode: RegistrationApprovalMode.PAYMENT_EXCEPTION,
  actorRole: 'SUPER_ADMIN',
  discountAmount: 1000,
  approvedAmount: 50000,
  exceptionReason: 'استثنا',
}), /بدون تخفیف/);
assert.deepEqual(plan({ approvedAmount: 100000 }).installmentAmounts, []);
const overpaid = plan({ approvedAmount: 110000 });
assert.equal(overpaid.remaining, 0);
assert.deepEqual(overpaid.installmentAmounts, []);
assert.equal(overpaid.totalPaid - overpaid.finalTuition, 10000);
assert.throws(() => plan({
  mode: RegistrationApprovalMode.PAYMENT_EXCEPTION,
  actorRole: 'SUPER_ADMIN',
  approvedAmount: 60000,
  exceptionReason: 'استثنای پرداخت',
}), /کمتر از ۶۰٪/);
assert.throws(() => plan({
  mode: RegistrationApprovalMode.DISCOUNT,
  discountAmount: 0,
  discountReason: 'تخفیف',
  approvedAmount: 60000,
}), /مبلغ و علت تخفیف/);
assert.throws(() => plan({
  approvedAmount: 60000,
  firstDueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
}), /گذشته/);

// A date-only value from an HTML date input means the whole calendar day,
// not midnight at the beginning of that day.
const fixedNow = new Date('2026-10-14T15:00:00.000Z');
const dueToday = plan({
  approvedAmount: 60000,
  firstDueDate: '2026-10-14',
  now: fixedNow,
});
assert.equal(dueToday.installmentAmounts.length, 2);
assert.throws(() => plan({
  approvedAmount: 60000,
  firstDueDate: '2026-10-13',
  now: fixedNow,
}), /گذشته/);

// Month-end installment dates must clamp rather than overflow into the following month.
assert.equal(addOneMonthClamped(new Date('2027-01-31T00:00:00.000Z')).toISOString(), '2027-02-28T00:00:00.000Z');
assert.equal(addOneMonthClamped(new Date('2028-01-31T00:00:00.000Z')).toISOString(), '2028-02-29T00:00:00.000Z');
assert.equal(addOneMonthClamped(new Date('2027-03-31T00:00:00.000Z')).toISOString(), '2027-04-30T00:00:00.000Z');

// Calendar-based reminder windows must not mark an installment overdue during its due date.
const reminderWindows = getInstallmentReminderWindows(new Date('2026-10-14T18:30:00.000Z'));
assert.equal(reminderWindows.todayStart.toISOString(), '2026-10-14T00:00:00.000Z');
assert.equal(reminderWindows.dueSoonStart.toISOString(), '2026-10-17T00:00:00.000Z');
assert.equal(reminderWindows.dueSoonEnd.toISOString(), '2026-10-18T00:00:00.000Z');
assert.equal(reminderWindows.overdueRepeatBefore.toISOString(), '2026-10-11T18:30:00.000Z');
assert.throws(() => getInstallmentReminderWindows(new Date('invalid')), /تاریخ اجرای یادآوری/);

// Refund availability must exclude tuition obligations and existing reservations.
assert.equal(calculateRefundAvailableBalance({
  totalApprovedPayments: 150000,
  totalTuition: 100000,
  alreadyReserved: 10000,
}), 40000);
assert.equal(calculateRefundAvailableBalance({
  totalApprovedPayments: 90000,
  totalTuition: 100000,
  alreadyReserved: 0,
}), 0);
assert.equal(calculateRefundAvailableBalance({
  totalApprovedPayments: 100000.119,
  totalTuition: 50000,
  alreadyReserved: 10000.105,
}), 40000.01);
assert.throws(() => calculateRefundAvailableBalance({
  totalApprovedPayments: -1,
  totalTuition: 0,
  alreadyReserved: 0,
}), /موجودی بازپرداخت/);

// Payments must settle the oldest outstanding installment first and never exceed debt.
const allocationPlan = planOldestDebtAllocations([
  { id: 'newer', dueDate: new Date('2027-03-01T00:00:00.000Z'), sequence: 1, amount: 500, allocated: 0 },
  { id: 'oldest', dueDate: new Date('2027-01-01T00:00:00.000Z'), sequence: 1, amount: 100, allocated: 20 },
  { id: 'middle', dueDate: new Date('2027-02-01T00:00:00.000Z'), sequence: 1, amount: 200, allocated: 0 },
], 250);
assert.deepEqual(allocationPlan, [
  { installmentId: 'oldest', amount: 80 },
  { installmentId: 'middle', amount: 170 },
]);
assert.deepEqual(planOldestDebtAllocations([
  { id: 'settled', dueDate: new Date('2027-01-01T00:00:00.000Z'), amount: 100, allocated: 100 },
], 0), []);
assert.deepEqual(planOldestDebtAllocations([
  { id: 'only', dueDate: new Date('2027-01-01T00:00:00.000Z'), amount: 100, allocated: 50 },
], 51), [{ installmentId: 'only', amount: 50 }]);
assert.throws(() => planOldestDebtAllocations([], -1), /مبلغ تخصیص/);
assert.throws(() => planOldestDebtAllocations([
  { id: 'corrupt', dueDate: new Date('2027-01-01T00:00:00.000Z'), amount: 100, allocated: 101 },
], 1), /اطلاعات قسط/);
assert.deepEqual(planOldestDebtAllocations([
  { id: 'b', dueDate: new Date('2027-01-01T00:00:00.000Z'), sequence: 2, amount: 100, allocated: 0 },
  { id: 'a', dueDate: new Date('2027-01-01T00:00:00.000Z'), sequence: 1, amount: 100, allocated: 0 },
], 150), [
  { installmentId: 'a', amount: 100 },
  { installmentId: 'b', amount: 50 },
]);

console.log('Registration finance rules: regression assertions passed.');
