require('reflect-metadata');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { StudentLevel } = require('@prisma/client');
const { CreateRegistrationDto } = require('../dist/src/registrations/dto/create-registration.dto');
const { CreateRefundRequestDto } = require('../dist/src/registrations/dto/create-refund-request.dto');
const { MarkRefundPaidDto } = require('../dist/src/registrations/dto/mark-refund-paid.dto');
const { ReviewRegistrationDto } = require('../dist/src/registrations/dto/review-registration.dto');
const { SubmitInstallmentPaymentDto } = require('../dist/src/registrations/dto/submit-installment-payment.dto');
const { ReviewInstallmentPaymentDto } = require('../dist/src/registrations/dto/review-installment-payment.dto');
const { ReviewRefundRequestDto } = require('../dist/src/registrations/dto/review-refund-request.dto');
const { AuthGuard } = require('../dist/src/auth/auth.guard');
const { RegistrationApprovalMode } = require('@prisma/client');

async function errorsFor(Type, input) {
  return validate(plainToInstance(Type, input));
}

async function main() {
  const validRegistration = {
    applicantFullName: 'هنرجوی آزمایشی',
    nationalId: '۱۲۳۴۵۶۷۸۹۰',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    academicLevel: StudentLevel.MASTER,
    fieldCode: '  1201  ',
    courseIds: '["course-id"]',
    claimedAmount: '60000',
  };
  const valid = plainToInstance(CreateRegistrationDto, validRegistration);
  assert.equal(valid.nationalId, '1234567890');
  assert.equal(valid.phone, '09123456789');
  assert.equal(valid.applicantFullName, 'هنرجوی آزمایشی');
  assert.equal(valid.fieldCode, '1201');
  assert.equal(valid.claimedAmount, 60000);
  assert.deepEqual(await errorsFor(CreateRegistrationDto, validRegistration), []);

  const arabicIndic = plainToInstance(CreateRegistrationDto, {
    ...validRegistration, nationalId: '١٢٣٤٥٦٧٨٩٠', phone: '٠٩١٢٣٤٥٦٧٨٩', claimedAmount: '٦٠٠٠٠',
  });
  assert.equal(arabicIndic.nationalId, '1234567890');
  assert.equal(arabicIndic.phone, '09123456789');
  assert.equal(arabicIndic.claimedAmount, 60000);

  assert.ok((await errorsFor(CreateRegistrationDto, {
    ...validRegistration, applicantFullName: '   ',
  })).some((error) => error.property === 'applicantFullName'));
  assert.ok((await errorsFor(CreateRegistrationDto, {
    ...validRegistration, fieldCode: '   ',
  })).some((error) => error.property === 'fieldCode'));
  assert.ok((await errorsFor(CreateRegistrationDto, {
    ...validRegistration, nationalId: '12345',
  })).some((error) => error.property === 'nationalId'));
  assert.ok((await errorsFor(CreateRegistrationDto, {
    ...validRegistration, phone: '12345678901',
  })).some((error) => error.property === 'phone'));

  const validRefund = { registrationId: 'registration-id', amountRequested: '1000', reason: 'اضافه پرداخت' };
  const refund = plainToInstance(CreateRefundRequestDto, validRefund);
  assert.equal(refund.reason, 'اضافه پرداخت');
  assert.deepEqual(await errorsFor(CreateRefundRequestDto, validRefund), []);
  assert.ok((await errorsFor(CreateRefundRequestDto, {
    ...validRefund, reason: '     ',
  })).some((error) => error.property === 'reason'));

  assert.deepEqual(await errorsFor(MarkRefundPaidDto, { transferReference: ' TRX-123 ' }), []);
  assert.ok((await errorsFor(MarkRefundPaidDto, { transferReference: '   ' }))
    .some((error) => error.property === 'transferReference'));

  const validReview = {
    mode: RegistrationApprovalMode.NORMAL,
    discountAmount: '0',
    paymentId: 'payment-id',
    approvedAmount: '60000',
    firstDueDate: '2026-10-14',
  };
  const review = plainToInstance(ReviewRegistrationDto, validReview);
  assert.equal(review.discountAmount, 0);
  assert.equal(review.approvedAmount, 60000);
  assert.deepEqual(await errorsFor(ReviewRegistrationDto, validReview), []);
  assert.ok((await errorsFor(ReviewRegistrationDto, { ...validReview, mode: 'INVALID_MODE' }))
    .some((error) => error.property === 'mode'));
  assert.ok((await errorsFor(ReviewRegistrationDto, { ...validReview, discountAmount: '-1' }))
    .some((error) => error.property === 'discountAmount'));

  const installmentPayment = plainToInstance(SubmitInstallmentPaymentDto, { claimedAmount: '2500' });
  assert.equal(installmentPayment.claimedAmount, 2500);
  assert.deepEqual(await errorsFor(SubmitInstallmentPaymentDto, { claimedAmount: '2500' }), []);
  assert.ok((await errorsFor(SubmitInstallmentPaymentDto, { claimedAmount: '0' }))
    .some((error) => error.property === 'claimedAmount'));

  const validInstallmentReview = { status: 'APPROVED', approvedAmount: '2500' };
  const installmentReview = plainToInstance(ReviewInstallmentPaymentDto, validInstallmentReview);
  assert.equal(installmentReview.approvedAmount, 2500);
  assert.deepEqual(await errorsFor(ReviewInstallmentPaymentDto, validInstallmentReview), []);
  assert.ok((await errorsFor(ReviewInstallmentPaymentDto, { status: 'UNKNOWN' }))
    .some((error) => error.property === 'status'));
  assert.ok((await errorsFor(ReviewInstallmentPaymentDto, { status: 'APPROVED', approvedAmount: '0' }))
    .some((error) => error.property === 'approvedAmount'));

  const validRefundReview = { decision: 'RESERVE', note: 'بررسی شد' };
  assert.deepEqual(await errorsFor(ReviewRefundRequestDto, validRefundReview), []);
  assert.ok((await errorsFor(ReviewRefundRequestDto, { decision: 'PAY' }))
    .some((error) => error.property === 'decision'));

  // Staff permission routing must protect every registration/receipt/refund admin endpoint.
  const guard = Object.create(AuthGuard.prototype);
  for (const path of [
    '/admin/registrations',
    '/admin/registrations/registration-id/approve',
    '/admin/registration-payments/payment-id/review',
    '/admin/registration-receipts/receipt-id',
    '/admin/refunds',
    '/admin/refunds/refund-id/review',
    '/admin/refunds/refund-id/paid',
  ]) {
    assert.equal(guard.permissionForPath(path), 'finance', `finance permission mapping: ${path}`);
  }
  assert.equal(guard.permissionForPath('/admin/support/tickets'), 'messages');
  assert.equal(guard.permissionForPath('/admin/unmapped-sensitive-route'), null);

  console.log('Registration DTO validation: regression assertions passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
