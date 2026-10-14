import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
const { memoryStorage } = require('multer');
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReviewRegistrationDto } from './dto/review-registration.dto';
import { SubmitInstallmentPaymentDto } from './dto/submit-installment-payment.dto';
import { ReviewInstallmentPaymentDto } from './dto/review-installment-payment.dto';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { MarkRefundPaidDto } from './dto/mark-refund-paid.dto';
import { ReviewRefundRequestDto } from './dto/review-refund-request.dto';
import { RegistrationsService } from './registrations.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('public/registration/courses')
  listPublicCourses() {
    return this.registrationsService.listPublicCourses();
  }

  @Post('public/registrations')
  @UseInterceptors(FileInterceptor('receipt', {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  }))
  createPublicRegistration(@Body() dto: CreateRegistrationDto, @UploadedFile() file: any) {
    return this.registrationsService.createPublicRegistration(dto, file);
  }

  @Get('public/registrations/:registrationId/status')
  getPublicRegistrationStatus(
    @Param('registrationId') registrationId: string,
    @Query('nationalId') nationalId: string,
    @Query('phone') phone: string,
  ) {
    return this.registrationsService.getPublicRegistrationStatus(registrationId, nationalId, phone);
  }

  @Post('public/registrations/:registrationId/receipts')
  @UseInterceptors(FileInterceptor('receipt', {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  }))
  uploadCorrectionReceipt(
    @Param('registrationId') registrationId: string,
    @Body('nationalId') nationalId: string,
    @Body('phone') phone: string,
    @Body('claimedAmount') claimedAmount: string,
    @Body('paymentDate') paymentDate: string,
    @Body('trackingCode') trackingCode: string,
    @UploadedFile() file: any,
  ) {
    return this.registrationsService.uploadCorrectionReceipt(
      registrationId,
      { nationalId, phone, claimedAmount: Number(claimedAmount), paymentDate, trackingCode },
      file,
    );
  }

  @Post('student/installments/:installmentId/payments')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('receipt', {
    storage: memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  }))
  submitInstallmentPayment(
    @Req() req: AuthenticatedRequest,
    @Param('installmentId') installmentId: string,
    @Body() dto: SubmitInstallmentPaymentDto,
    @UploadedFile() file: any,
  ) {
    return this.registrationsService.submitInstallmentPayment(req.user, installmentId, dto, file);
  }

  @Patch('admin/registration-payments/:paymentId/review')
  @UseGuards(AuthGuard)
  reviewInstallmentPayment(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId') paymentId: string,
    @Body() dto: ReviewInstallmentPaymentDto,
  ) {
    return this.registrationsService.reviewInstallmentPayment(req.user, paymentId, dto);
  }

  @Get('student/registrations')
  @UseGuards(AuthGuard)
  listStudentRegistrations(@Req() req: AuthenticatedRequest) {
    return this.registrationsService.listStudentRegistrations(req.user);
  }

  @Get('student/refunds')
  @UseGuards(AuthGuard)
  listStudentRefundRequests(@Req() req: AuthenticatedRequest) {
    return this.registrationsService.listStudentRefundRequests(req.user);
  }

  @Post('student/refunds')
  @UseGuards(AuthGuard)
  createRefundRequest(@Req() req: AuthenticatedRequest, @Body() dto: CreateRefundRequestDto) {
    return this.registrationsService.createRefundRequest(req.user, dto);
  }

  @Get('admin/refunds')
  @UseGuards(AuthGuard)
  listAdminRefundRequests(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.registrationsService.listAdminRefundRequests(req.user, status);
  }

  @Patch('admin/refunds/:refundId/review')
  @UseGuards(AuthGuard)
  reviewRefundRequest(
    @Req() req: AuthenticatedRequest,
    @Param('refundId') refundId: string,
    @Body() body: ReviewRefundRequestDto,
  ) {
    return this.registrationsService.reviewRefundRequest(req.user, refundId, body.decision, body.note);
  }

  @Patch('admin/refunds/:refundId/paid')
  @UseGuards(AuthGuard)
  markRefundPaid(
    @Req() req: AuthenticatedRequest,
    @Param('refundId') refundId: string,
    @Body() dto: MarkRefundPaidDto,
  ) {
    return this.registrationsService.markRefundPaid(req.user, refundId, dto);
  }

  @Get('admin/registrations/mock-exams')
  @UseGuards(AuthGuard)
  listMockExamsForRegistrationReview(@Req() req: AuthenticatedRequest) {
    return this.registrationsService.listMockExamsForRegistrationReview(req.user);
  }

  @Get('admin/registrations')
  @UseGuards(AuthGuard)
  listAdminRegistrations(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.registrationsService.listAdminRegistrations(req.user, status);
  }

  @Patch('admin/registrations/:registrationId/approve')
  @UseGuards(AuthGuard)
  reviewAndApprove(
    @Req() req: AuthenticatedRequest,
    @Param('registrationId') registrationId: string,
    @Body() dto: ReviewRegistrationDto,
  ) {
    return this.registrationsService.reviewAndApprove(req.user, registrationId, dto);
  }

  @Patch('admin/registrations/:registrationId/correction')
  @UseGuards(AuthGuard)
  requestCorrection(
    @Req() req: AuthenticatedRequest,
    @Param('registrationId') registrationId: string,
    @Body('note') note: string,
  ) {
    return this.registrationsService.requestCorrection(req.user, registrationId, note);
  }

  @Patch('admin/registrations/:registrationId/reject')
  @UseGuards(AuthGuard)
  rejectRegistration(
    @Req() req: AuthenticatedRequest,
    @Param('registrationId') registrationId: string,
    @Body('reason') reason: string,
  ) {
    return this.registrationsService.rejectRegistration(req.user, registrationId, reason);
  }

  @Get('admin/registration-receipts/:receiptId')
  @UseGuards(AuthGuard)
  async viewReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('receiptId') receiptId: string,
    @Res() res: Response,
  ) {
    const receipt = await this.registrationsService.viewReceipt(req.user, receiptId);
    res.setHeader('Content-Type', receipt.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return createReadStream(receipt.path).pipe(res);
  }
}
