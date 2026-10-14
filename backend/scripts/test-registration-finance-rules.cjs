const assert = require('node:assert/strict');
const { RegistrationApprovalMode } = require('@prisma/client');
const { addOneMonthClamped, calculateRegistrationApprovalPlan } = require('../dist/src/registrations/registration-finance.rules');

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

console.log('Registration finance rules: regression assertions passed.');
