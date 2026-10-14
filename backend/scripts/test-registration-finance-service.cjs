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
  let studentId;
  let studentUserId;
  let registrationId;
  let secondRegistrationId;
  let thirdRegistrationId;
  let examId;
  const courseIds = [];
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

    const firstCourse = await prisma.course.create({
      data: {
        title: 'CI finance course A ' + nationalId,
        professor: 'CI Test',
        price: 1000,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    courseIds.push(firstCourse.id);

    const mockExam = await prisma.mockExam.create({
      data: {
        title: 'CI mock exam ' + nationalId,
        level: 'MASTER',
        field: 'CI',
        examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'SCHEDULED',
      },
      select: { id: true },
    });
    examId = mockExam.id;

    const jpeg = { buffer: Buffer.from([0xff, 0xd8, 0xff]), mimetype: 'image/jpeg', size: 3 };
    const submitted = await service.createPublicRegistration({
      applicantFullName: 'CI Finance Student',
      nationalId,
      phone,
      academicLevel: 'MASTER',
      fieldCode: 'CI',
      courseIds: JSON.stringify([firstCourse.id]),
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
      mockExamEligible: true,
      mockExamId: examId,
      reviewNote: 'CI service integration approval',
    });
    assert.equal(approved.success, true);
    assert.equal(approved.finalTuition, 1000);
    assert.equal(approved.remaining, 0);
    assert.equal(approved.installmentCount, 0);
    studentId = approved.studentId;
    const participant = await prisma.mockExamParticipant.findUnique({
      where: { mockExamId_studentId: { mockExamId: examId, studentId } },
    });
    assert.ok(participant, 'eligible student must be added to the selected scheduled mock exam');
    assert.equal(await service.listMockExamsForRegistrationReview(actor).then((items) => items.some((item) => item.id === examId)), true);

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
    const firstStudentRegistrations = await service.listStudentRegistrations(studentActor);
    assert.equal(firstStudentRegistrations.length, 1);
    assert.equal(firstStudentRegistrations[0].finalTuition, 1000);
    assert.equal(firstStudentRegistrations[0].installments.length, 0);

    // A later registration has its own debt. It must not consume the earlier
    // registration's unused overpayment when refund availability is calculated.
    const secondCourse = await prisma.course.create({
      data: {
        title: 'CI finance course B ' + nationalId,
        professor: 'CI Test',
        price: 1000,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    courseIds.push(secondCourse.id);
    const secondSubmitted = await service.createPublicRegistration({
      applicantFullName: 'CI Finance Student',
      nationalId,
      phone,
      academicLevel: 'MASTER',
      fieldCode: 'CI',
      courseIds: JSON.stringify([secondCourse.id]),
      claimedAmount: 600,
      trackingCode: 'CI-SECOND-INITIAL',
    }, jpeg);
    secondRegistrationId = secondSubmitted.id;
    const secondDue = new Date();
    secondDue.setDate(secondDue.getDate() + 30);
    const secondApproved = await service.reviewAndApprove(actor, secondSubmitted.id, {
      mode: 'NORMAL',
      discountAmount: 0,
      paymentId: secondSubmitted.paymentId,
      approvedAmount: 600,
      firstDueDate: secondDue.toISOString().slice(0, 10),
      mockExamEligible: false,
      reviewNote: 'CI installment registration',
    });
    assert.equal(secondApproved.installmentCount, 2);
    const secondInstallments = await prisma.installment.findMany({
      where: { registrationId: secondRegistrationId },
      orderBy: { sequence: 'asc' },
    });
    assert.equal(secondInstallments.length, 2);
    assert.equal(Number(secondInstallments[0].amount), 200);
    assert.equal(Number(secondInstallments[1].amount), 200);

    // Reminder delivery must be idempotent, and the first overdue alert must
    // follow a prior due-soon alert without waiting another three days.
    const { getInstallmentReminderWindows } = require('../dist/src/registrations/registration-finance.rules');
    const reminderWindows = getInstallmentReminderWindows(new Date());
    await prisma.installment.update({
      where: { id: secondInstallments[0].id },
      data: { dueDate: reminderWindows.dueSoonStart, status: 'PENDING', lastReminderAt: null, lastReminderType: null },
    });
    await service.sendDueInstallmentReminders();
    const dueSoonCount = await prisma.notification.count({
      where: { createdById: adminId, title: 'یادآوری سررسید قسط' },
    });
    assert.equal(dueSoonCount, 1);
    await service.sendDueInstallmentReminders();
    assert.equal(await prisma.notification.count({
      where: { createdById: adminId, title: 'یادآوری سررسید قسط' },
    }), dueSoonCount, 'a due-soon reminder must not duplicate on the next scheduler run');

    const yesterday = new Date(reminderWindows.todayStart.getTime() - 24 * 60 * 60 * 1000);
    await prisma.installment.update({
      where: { id: secondInstallments[0].id },
      data: { dueDate: yesterday },
    });
    await service.sendDueInstallmentReminders();
    const overdueCount = await prisma.notification.count({
      where: { createdById: adminId, title: 'یادآوری قسط سررسیدگذشته' },
    });
    assert.equal(overdueCount, 1, 'the first overdue reminder should follow the due-soon reminder');
    await service.sendDueInstallmentReminders();
    assert.equal(await prisma.notification.count({
      where: { createdById: adminId, title: 'یادآوری قسط سررسیدگذشته' },
    }), overdueCount, 'overdue reminders must be throttled for three days');
    assert.equal((await prisma.installment.findUniqueOrThrow({ where: { id: secondInstallments[0].id } })).status, 'OVERDUE');

    const refund = await service.createRefundRequest(studentActor, {
      registrationId,
      amountRequested: 150,
      reason: 'CI test refund of earlier registration overpayment',
    });
    assert.equal(Number(refund.amountRequested), 150);
    const reserved = await service.reviewRefundRequest(actor, refund.id, 'RESERVE', 'CI reserve');
    assert.equal(reserved.status, 'RESERVED');
    assert.equal(Number(reserved.amountReserved), 150);

    const secondRefund = await service.createRefundRequest(studentActor, {
      registrationId,
      amountRequested: 100,
      reason: 'CI test exceeding remaining registration-specific refund balance',
    });
    await assert.rejects(
      () => service.reviewRefundRequest(actor, secondRefund.id, 'RESERVE', 'CI over-reservation check'),
      /موجودی قابل بازپرداخت کافی نیست/,
      'refund reservations must not exceed the remaining overpayment for that registration',
    );

    const installmentPayment = await service.submitInstallmentPayment(
      studentActor,
      secondInstallments[0].id,
      { claimedAmount: 200, trackingCode: 'CI-INSTALLMENT-1' },
      jpeg,
    );
    const installmentReview = await service.reviewInstallmentPayment(actor, installmentPayment.id, {
      status: 'APPROVED',
      approvedAmount: 200,
      reviewNote: 'CI installment approval',
    });
    assert.equal(installmentReview.status, 'APPROVED');
    const updatedInstallment = await prisma.installment.findUniqueOrThrow({ where: { id: secondInstallments[0].id } });
    assert.equal(updatedInstallment.status, 'PAID');

    const paid = await service.markRefundPaid(actor, refund.id, { transferReference: 'CI-TRANSFER-001' });
    assert.equal(paid.status, 'PAID');
    assert.equal(Number(paid.amountPaid), 150);
    const visibleRefunds = await service.listStudentRefundRequests(studentActor);
    assert.equal(visibleRefunds.find((item) => item.id === refund.id).status, 'PAID');

    // Corrected receipts must be appended as a new payment and preserve the old receipt.
    const thirdCourse = await prisma.course.create({
      data: { title: 'CI finance course C ' + nationalId, professor: 'CI Test', price: 500, status: 'ACTIVE' },
      select: { id: true },
    });
    courseIds.push(thirdCourse.id);
    const thirdSubmitted = await service.createPublicRegistration({
      applicantFullName: 'CI Finance Student',
      nationalId,
      phone,
      academicLevel: 'MASTER',
      fieldCode: 'CI',
      courseIds: JSON.stringify([thirdCourse.id]),
      claimedAmount: 300,
      trackingCode: 'CI-RECEIPT-TO-CORRECT',
    }, jpeg);
    thirdRegistrationId = thirdSubmitted.id;
    await service.requestCorrection(actor, thirdRegistrationId, 'Please upload a clearer receipt.');
    const correctedPayment = await service.uploadCorrectionReceipt(thirdRegistrationId, {
      nationalId,
      phone,
      claimedAmount: 300,
      trackingCode: 'CI-CORRECTED-RECEIPT',
    }, jpeg);
    assert.equal(correctedPayment.status, 'PENDING');
    const correctedRegistration = await prisma.registration.findUniqueOrThrow({
      where: { id: thirdRegistrationId },
      include: { payments: { include: { receipts: true } } },
    });
    assert.equal(correctedRegistration.status, 'PENDING_REVIEW');
    assert.equal(correctedRegistration.payments.length, 2);
    assert.equal(correctedRegistration.payments.find((item) => item.id === thirdSubmitted.paymentId).status, 'REJECTED');
    assert.equal(correctedRegistration.payments.find((item) => item.id === correctedPayment.id).receipts.length, 1);
    assert.equal(correctedRegistration.payments.find((item) => item.id === thirdSubmitted.paymentId).receipts.length, 1);
    console.log('Registration finance service integration test passed.');
  } finally {
    try {
      const registrationIds = [registrationId, secondRegistrationId, thirdRegistrationId].filter(Boolean);
      const payments = registrationIds.length
        ? await prisma.registrationPayment.findMany({ where: { registrationId: { in: registrationIds } }, select: { id: true } }).catch(() => [])
        : [];
      const installments = registrationIds.length
        ? await prisma.installment.findMany({ where: { registrationId: { in: registrationIds } }, select: { id: true } }).catch(() => [])
        : [];
      const paymentIds = payments.map((item) => item.id);
      const installmentIds = installments.map((item) => item.id);
      if (registrationIds.length) {
        await prisma.refundRequest.deleteMany({ where: { registrationId: { in: registrationIds } } }).catch(() => undefined);
      }
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
        await prisma.auditLog.deleteMany({
          where: { actorUserId: { in: [adminId, studentUserId].filter(Boolean) } },
        }).catch(() => undefined);
      }
      await prisma.notification.deleteMany({ where: { createdById: adminId, title: { in: ['یادآوری سررسید قسط', 'یادآوری قسط سررسیدگذشته'] } } }).catch(() => undefined);
      if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => undefined);
      if (examId) await prisma.mockExam.delete({ where: { id: examId } }).catch(() => undefined);
      if (courseIds.length) await prisma.course.deleteMany({ where: { id: { in: courseIds } } }).catch(() => undefined);
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
