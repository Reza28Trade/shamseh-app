import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportService } from './support.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  createTicket(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user, dto);
  }

  @Get('support/tickets')
  listStudentTickets(@Req() req: AuthenticatedRequest) {
    return this.supportService.listStudentTickets(req.user);
  }

  @Post('support/tickets/:ticketId/messages')
  addStudentMessage(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.addStudentMessage(req.user, ticketId, dto);
  }

  @Get('admin/support/tickets')
  listStaffTickets(@Req() req: AuthenticatedRequest) {
    return this.supportService.listStaffTickets(req.user);
  }

  @Post('admin/support/tickets/:ticketId/messages')
  addStaffMessage(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.addStaffMessage(req.user, ticketId, dto);
  }

  @Patch('admin/support/tickets/:ticketId/status')
  updateTicketStatus(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body('status') status: 'OPEN' | 'ANSWERED' | 'CLOSED',
  ) {
    return this.supportService.updateTicketStatus(req.user, ticketId, status);
  }
}
