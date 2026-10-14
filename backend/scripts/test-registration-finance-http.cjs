const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomInt } = require('node:crypto');
const { ValidationPipe } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');

async function main() {
  const receiptDir = await mkdtemp(join(tmpdir(), 'shamseh-finance-http-'));
  process.env.REGISTRATION_RECEIPT_STORAGE_PATH = receiptDir;

  const { RegistrationsModule } = require('../dist/src/registrations/registrations.module');
  const { AuthGuard } = require('../dist/src/auth/auth.guard');
  const { PrismaService } = require('../dist/src/database/prisma.service');

  let adminActor = null;
  let studentActor = null;
  const testGuard = {
    canActivate(context) {
      const request = context.switchToHttp().getRequest();
      request.user = (request.originalUrl || request.url).startsWith('/api/student/')
        ? studentActor
        : adminActor;
      return Boolean(request.user);
    },
  };

  const testingModule = await Test.createTestingModule({ imports: [RegistrationsModule] })
    .overrideGuard(AuthGuard)
    .useValue(testGuard)
    .compile();
  const app = testingModule.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  let adminId;
  let studentId;
  let studentUserId;
  let registrationId;
  let refundId;
  let secondRefundId;
  let courseId;
  let prisma;
  const nationalId = '8' + String(randomInt(100000000, 999999999));
  const phone = '09123456789';

  try {
    await app.init();
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: {
        username: 'ci-http-admin-' + nationalId,
        passwordHash: 'ci-only-hash',
        role: 'SUPER_ADMIN',
      },
      select: { id: true, username: true },
    });
    adminId = admin.id;
    adminActor = {
      id: admin.id,
      username: admin.username,
      role: 'SUPER_ADMIN',
      studentId: null,
      permissions: [],
      sessionToken: 'ci-http-admin-session',
    };

    const course = await prisma.course.create({
      data: {
        title: 'CI HTTP finance course ' + nationalId,
        professor: 'CI Test',
        price: 1000,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    courseId = course.id;

    const address = app.getHttpServer().address();
    const baseUrl = 'http://127.0.0.1:' + address.port;
    const request = async (path, init = {}) => {
      const response = await fetch(baseUrl + path, init);
      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
      if (!response.ok) {
        const message = body && typeof body === 'object' ? body.message : raw;
        throw new Error('HTTP ' + response.status + ' ' + path + ': ' + JSON.stringify(message));
      }
      return body;
    };

    const form = new FormData();
    form.set('applicantFullName', 'CI HTTP Finance Student');
    form.set('nationalId', nationalId);
    form.set('phone', phone);
    form.set('academicLevel', 'MASTER');
    form.set('fieldCode', 'CI');
    form.set('courseIds', JSON.stringify([course.id]));
    form.set('claimedAmount', '1200');
    form.set('trackingCode', 'CI-HTTP-INITIAL');
    form.set('receipt', new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'receipt.jpg');

    const submitted = await request('/api/public/registrations', { method: 'POST', body: form });
    registrationId = submitted.id;
    assert.equal(submitted.status, 'PENDING_REVIEW');
    assert.ok(submitted.paymentId);

    const adminRows = await request('/api/admin/registrations?status=PENDING_REVIEW');
    const row = adminRows.find((item) => item.id === registrationId);
    assert.ok(row, 'HTTP admin list should return submitted registration');
    const receipt = row.payments.find((payment) => payment.id === submitted.paymentId).receipts[0];
    assert.equal(typeof receipt.fileSize, 'number', 'HTTP JSON must serialize receipt file size');

    const today = new Date().toISOString().slice(0, 10);
    const approved = await request('/api/admin/registrations/' + encodeURIComponent(registrationId) + '/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'NORMAL',
        discountAmount: 0,
        paymentId: submitted.paymentId,
        approvedAmount: 1200,
        firstDueDate: today,
        mockExamEligible: false,
        reviewNote: 'CI HTTP workflow approval',
      }),
    });
    assert.equal(approved.success, true);
    assert.equal(approved.installmentCount, 0);
    studentId = approved.studentId;

    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: true },
    });
    studentUserId = student.userId;
    studentActor = {
      id: student.userId,
      username: student.user.username,
      role: 'STUDENT',
      studentId,
      permissions: [],
      sessionToken: 'ci-http-student-session',
    };

    const studentRegistrations = await request('/api/student/registrations');
    assert.equal(studentRegistrations.length, 1);
    assert.equal(studentRegistrations[0].finalTuition, 1000);

    const refund = await request('/api/student/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId,
        amountRequested: 150,
        reason: 'CI HTTP refund request',
      }),
    });
    refundId = refund.id;
    assert.equal(Number(refund.amountRequested), 150);

    const reserved = await request('/api/admin/refunds/' + encodeURIComponent(refundId) + '/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'RESERVE', note: 'CI HTTP reserve' }),
    });
    assert.equal(reserved.status, 'RESERVED');
    assert.equal(Number(reserved.amountReserved), 150);

    const secondRefund = await request('/api/student/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId,
        amountRequested: 100,
        reason: 'CI HTTP over-reservation check',
      }),
    });
    secondRefundId = secondRefund.id;
    const overReserveResponse = await fetch(baseUrl + '/api/admin/refunds/' + encodeURIComponent(secondRefundId) + '/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'RESERVE', note: 'CI HTTP should reject excess' }),
    });
    assert.equal(overReserveResponse.status, 400, 'HTTP must reject a refund exceeding the remaining balance');

    const paid = await request('/api/admin/refunds/' + encodeURIComponent(refundId) + '/paid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferReference: 'CI-HTTP-TRANSFER-001' }),
    });
    assert.equal(paid.status, 'PAID');
    const refunds = await request('/api/student/refunds');
    assert.equal(refunds.find((item) => item.id === refundId).status, 'PAID');
    console.log('Registration finance HTTP end-to-end test passed.');
  } finally {
    try {
      if (prisma) {
        const registrationIds = [registrationId].filter(Boolean);
        const paymentRows = registrationIds.length
          ? await prisma.registrationPayment.findMany({ where: { registrationId: { in: registrationIds } }, select: { id: true } }).catch(() => [])
          : [];
        const installmentRows = registrationIds.length
          ? await prisma.installment.findMany({ where: { registrationId: { in: registrationIds } }, select: { id: true } }).catch(() => [])
          : [];
        const paymentIds = paymentRows.map((item) => item.id);
        const installmentIds = installmentRows.map((item) => item.id);
        if (registrationIds.length) await prisma.refundRequest.deleteMany({ where: { registrationId: { in: registrationIds } } }).catch(() => undefined);
        await prisma.paymentAllocation.deleteMany({
          where: { OR: [
            ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
            ...(installmentIds.length ? [{ installmentId: { in: installmentIds } }] : []),
          ] },
        }).catch(() => undefined);
        if (paymentIds.length) await prisma.registrationPaymentReceipt.deleteMany({ where: { paymentId: { in: paymentIds } } }).catch(() => undefined);
        if (registrationIds.length) {
          await prisma.registrationPayment.deleteMany({ where: { registrationId: { in: registrationIds } } }).catch(() => undefined);
          await prisma.installment.deleteMany({ where: { registrationId: { in: registrationIds } } }).catch(() => undefined);
          await prisma.registrationReviewHistory.deleteMany({ where: { registrationId: { in: registrationIds } } }).catch(() => undefined);
          await prisma.registration.deleteMany({ where: { id: { in: registrationIds } } }).catch(() => undefined);
        }
        if (studentId) {
          await prisma.studentProfileHistory.deleteMany({ where: { studentId } }).catch(() => undefined);
          await prisma.enrollment.deleteMany({ where: { studentId } }).catch(() => undefined);
          await prisma.student.delete({ where: { id: studentId } }).catch(() => undefined);
        }
        if (adminId || studentUserId) {
          await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [adminId, studentUserId].filter(Boolean) } } }).catch(() => undefined);
        }
        if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => undefined);
        if (courseId) await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
        if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
      }
    } finally {
      await app.close().catch(() => undefined);
      await rm(receiptDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
