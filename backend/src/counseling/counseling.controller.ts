import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CounselingService } from './counseling.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class CounselingController {
  constructor(private readonly counselingService: CounselingService) {}

  @Get('counseling/slots')
  listSlots(@Req() req: AuthenticatedRequest) { return this.counselingService.listSlots(req.user); }

  @Post('admin/counseling/slots')
  createSlot(@Req() req: AuthenticatedRequest, @Body() body: { startAt?: string }) {
    return this.counselingService.createSlot(req.user, body.startAt || '');
  }

  @Patch('admin/counseling/slots/:slotId')
  updateSlot(@Req() req: AuthenticatedRequest, @Param('slotId') slotId: string, @Body() body: { status?: string }) {
    return this.counselingService.updateSlot(req.user, slotId, body.status as any);
  }

  @Delete('admin/counseling/slots/:slotId')
  removeSlot(@Req() req: AuthenticatedRequest, @Param('slotId') slotId: string) {
    return this.counselingService.removeSlot(req.user, slotId);
  }

  @Post('counseling/requests')
  book(@Req() req: AuthenticatedRequest, @Body() body: { slotId?: string }) {
    return this.counselingService.book(req.user, body.slotId || '');
  }

  @Get('counseling/requests')
  listMine(@Req() req: AuthenticatedRequest) { return this.counselingService.listMine(req.user); }

  @Patch('counseling/requests/:requestId/cancel')
  cancelMine(@Req() req: AuthenticatedRequest, @Param('requestId') requestId: string) {
    return this.counselingService.cancelMine(req.user, requestId);
  }

  @Get('admin/counseling/requests')
  listRequests(@Req() req: AuthenticatedRequest) { return this.counselingService.listRequests(req.user); }

  @Patch('admin/counseling/requests/:requestId')
  updateRequest(@Req() req: AuthenticatedRequest, @Param('requestId') requestId: string, @Body() body: { status?: string }) {
    return this.counselingService.updateRequest(req.user, requestId, body.status as any);
  }

  @Get('admin/students/:studentId/counseling-summary')
  getStudentSummary(@Req() req: AuthenticatedRequest, @Param('studentId') studentId: string) {
    return this.counselingService.getStudentSummary(req.user, studentId);
  }
}
