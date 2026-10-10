import { Controller, Get, Post, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FinanceService } from './finance.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('admin/finance')
  listAdminFinance(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.financeService.listAdminFinance(req.user, { search, status, courseId });
  }

  @Post('admin/finance/students/:studentId/payments')
  createPayment(
    @Req() req: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.financeService.createPayment(req.user, studentId, dto);
  }

  @Get('student/finance')
  getStudentFinance(@Req() req: AuthenticatedRequest) {
    return this.financeService.getStudentFinance(req.user);
  }
}
