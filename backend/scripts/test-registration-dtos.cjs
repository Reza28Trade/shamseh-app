require('reflect-metadata');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { StudentLevel } = require('@prisma/client');
const { CreateRegistrationDto } = require('../dist/src/registrations/dto/create-registration.dto');
const { CreateRefundRequestDto } = require('../dist/src/registrations/dto/create-refund-request.dto');

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
  assert.deepEqual(await errorsFor(CreateRegistrationDto, validRegistration), []);

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

  console.log('Registration DTO validation: regression assertions passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
