const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomInt } = require('node:crypto');

async function main() {
  const receiptDir = await mkdtemp(join(tmpdir(), 'shamseh-finance-e2e-'));
  process.env.REGISTRATION_RECEIPT_STORAGE_PATH = receiptDir;

  const { PrismaService } = require('../dist/src/database/prisma.service');
  const { RegistrationsService } = require('../dist/src/registrations/registrations.service');
  const prisma = new PrismaService();
  const service = new RegistrationsService(prisma);

  let adminId;
  let courseId;
  let registrationId;
  let studentId;
  let studentUserId;
  const nationalId = '8' + String(randomInt(100000000, 999999999));
  const phone = '09123456789';

  try {
    await prisma.$connect();
    const admin = await prisma.user.create({
      data: {
        username: 'ci-finance-admin-' + nationalId,
        passwordHash: 'ci-only-hash',
        role: 'SUPER_ADMIN',
      },
      select: { id: true, username: true },
    });
    adminId = admin.id;
    const actor = {
      id: admin.id,
      username: admin.username,
      role: 'SUPER_ADMIN',
      studentId: null,
      permissions: [],
      sessionToken: 'ci-only-session',
    };

    const course = await prisma.course.create({
      data: {
        title: 'CI finance course ' + nationalId,
        professor: 'CI Test',
        price: 1000,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    courseId = course.id;

    const jpeg = { buffer: Buffer.from([0xff, 0xd8, 0xff]), mimetype: 'image/jpeg', size: 3 };
    const submitted = await service.createPublicRegistration({
      applicantFullName: 'CI Finance Student',
      nationalId,
      phone,
      academicLevel: 'MASTER',
      fieldCode: 'CI',
      courseIds: JSON.stringify([course.id]),
      claimedAmount: 1200,
      trackingCode: 'CI-INITIAL-OVERPAYMENT',
    }, jpeg);
    registrationId = submitted.id;
    assert.equal(submitted.status, 'PENDING_REVIEW');
    assert.ok(submitted.paymentId);

    const approved = await service.reviewAndApprove(actor, submitted.id, {
      mode: 'NORMAL',
      discountAmount: 0,
      paymentId: submitted.paymentId,
      approvedAmount: 1200,
      firstDueDate: new Date().toISOString().slice(0, 10),
      mockExamEligible: false,
      reviewNote: 'CI end-to-end approval',
    });
    assert.equal(approved.success, true);
    assert.equal(approved.finalTuition, 1000);
    assert.equal(approved.remaining, 0);
    assert.equal(approved.installmentCount, 0);
    studentId = approved.studentId;

    const adminRows = await service.listAdminRegistrations(actor, 'APPROVED');
    const adminRow = adminRows.find((row) => row.id === registrationId);
    assert.ok(adminRow, 'approved registration must appear in admin list');
    const initialPayment = adminRow.payments.find((payment) => payment.id === submitted.paymentId);
    assert.equal(initialPayment.status, 'APPROVED');
    assert.equal(typeof initialPayment.receipts[0].fileSize, 'number', 'receipt BigInt must be JSON-safe');
    assert.equal(initialPayment.receipts[0].fileSize, 3);

    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: true },
    });
    studentUserId = student.userId;
    assert.equal(student.user.username, nationalId, 'student username must be the national ID');
    const argon2 = require('argon2');
    assert.equal(await argon2.verify(student.user.passwordHash, phone), true, 'initial password must be the registered phone');

    const studentActor = {
      id: student.userId,
      username: student.user.username,
      role: 'STUDENT',
      studentId,
      permissions: [],
      sessionToken: 'ci-student-session',
    };
    const studentRegistrations = await service.listStudentRegistrations(studentActor);
    assert.equal(studentRegistrations.length, 1);
    assert.equal(studentRegistrations[0].finalTuition, 1000);
    assert.equal(studentRegistrations[0].installments.length, 0);

    const refund = await service.createRefundRequest(studentActor, {
      registrationId,
      amountRequested: 150,
      reason: 'CI test refund of verified overpayment',
    });
    assert.equal(Number(refund.amountRequested), 150);
    const reserved = await service.reviewRefundRequest(actor, refund.id, 'RESERVE', 'CI reserve');
    assert.equal(reserved.status, 'RESERVED');
    assert.equal(Number(reserved.amountReserved), 150);
    const paid = await service.markRefundPaid(actor, refund.id, { transferReference: 'CI-TRANSFER-001' });
    assert.equal(paid.status, 'PAID');
    assert.equal(Number(paid.amountPaid), 150);

    const secondRefund = await service.createRefundRequest(studentActor, {
      registrationId,
      amountRequested: 100,
      reason: 'CI test exceeding remaining refund balance',
    });
    await assert.rejects(
      () => service.reviewRefundRequest(actor, secondRefund.id, 'RESERVE', 'CI over-reservation check'),
      /موجودی قابل بازپرداخت کافی نیست/,
      'refund reservations must not exceed the remaining overpayment',
    );

    const visibleRefunds = await service.listStudentRefundRequests(studentActor);
    assert.equal(visibleRefunds.find((item) => item.id === refund.id).status, 'PAID');
    console.log('Registration finance service integration test passed.');
  } finally {
    try {
      if (registrationId) {
        const payments = await prisma.registrationPayment.findMany({ where: { registrationId }, select: { id: true } }).catch(() => []);
        const installments = await prisma.installment.findMany({ where: { registrationId }, select: { id: true } }).catch(() => []);
        const paymentIds = payments.map((item) => item.id);
        const installmentIds = installments.map((item) => item.id);
        await prisma.refundRequest.deleteMany({ where: { registrationId } }).catch(() => undefined);
        await prisma.paymentAllocation.deleteMany({
          where: { OR: [
            ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
            ...(installmentIds.length ? [{ installmentId: { in: installmentIds } }] : []),
          ] },
        }).catch(() => undefined);
        if (paymentIds.length) await prisma.registrationPaymentReceipt.deleteMany({ where: { paymentId: { in: paymentIds } } }).catch(() => undefined);
        await prisma.registrationPayment.deleteMany({ where: { registrationId } }).catch(() => undefined);
        await prisma.installment.deleteMany({ where: { registrationId } }).catch(() => undefined);
        await prisma.registrationReviewHistory.deleteMany({ where: { registrationId } }).catch(() => undefined);
        await prisma.registration.delete({ where: { id: registrationId } }).catch(() => undefined);
      }
      if (studentId) {
        await prisma.studentProfileHistory.deleteMany({ where: { studentId } }).catch(() => undefined);
        await prisma.enrollment.deleteMany({ where: { studentId } }).catch(() => undefined);
        await prisma.student.delete({ where: { id: studentId } }).catch(() => undefined);
      }
      if (adminId || studentUserId) {
        await prisma.auditLog.deleteMany({
          where: { actorUserId: { in: [adminId, studentUserId].filter(Boolean) } },
        }).catch(() => undefined);
      }
      if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => undefined);
      if (courseId) await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
      if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
    } finally {
      await prisma.$disconnect().catch(() => undefined);
      await rm(receiptDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
