import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMessageDto } from '../support/dto/create-message.dto';
import { CreateTicketDto } from '../support/dto/create-ticket.dto';
import { ManagementContactService } from './management-contact.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class ManagementContactController {
  constructor(private readonly managementContactService: ManagementContactService) {}

  @Post('management-contact/tickets')
  createStudentTicket(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    return this.managementContactService.createStudentTicket(req.user, dto);
  }

  @Get('management-contact/tickets')
  listStudentTickets(@Req() req: AuthenticatedRequest) {
    return this.managementContactService.listStudentTickets(req.user);
  }

  @Get('admin/management-contact/tickets')
  listManagementTickets(@Req() req: AuthenticatedRequest) {
    return this.managementContactService.listManagementTickets(req.user);
  }

  @Post('admin/management-contact/tickets/:ticketId/messages')
  addManagementReply(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.managementContactService.addManagementReply(req.user, ticketId, dto);
  }

  @Patch('admin/management-contact/tickets/:ticketId/status')
  updateTicketStatus(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body('status') status: 'OPEN' | 'ANSWERED' | 'CLOSED',
  ) {
    return this.managementContactService.updateTicketStatus(req.user, ticketId, status);
  }
}
