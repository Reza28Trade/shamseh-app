import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from '../support/dto/create-message.dto';
import { CreateTicketDto } from '../support/dto/create-ticket.dto';

type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

@Injectable()
export class ManagementContactService {
  constructor(private readonly prisma: PrismaService) {}

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }
    return user.studentId;
  }

  private requireSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin access required');
    }
  }

  async createStudentTicket(user: AuthenticatedUser, dto: CreateTicketDto) {
    const studentId = this.requireStudent(user);
    const ticket = await this.prisma.managementContactTicket.create({
      data: {
        studentId,
        subject: dto.subject.trim(),
        messages: {
          create: { senderUserId: user.id, content: dto.content.trim() },
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.publicTicket(ticket);
  }

  async listStudentTickets(user: AuthenticatedUser) {
    const studentId = this.requireStudent(user);
    const tickets = await this.prisma.managementContactTicket.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return tickets.map((ticket) => this.publicTicket(ticket));
  }

  async listManagementTickets(user: AuthenticatedUser) {
    this.requireSuperAdmin(user);
    const tickets = await this.prisma.managementContactTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return tickets.map((ticket) => ({ ...this.publicTicket(ticket), student: ticket.student }));
  }

  async addManagementReply(user: AuthenticatedUser, ticketId: string, dto: CreateMessageDto) {
    this.requireSuperAdmin(user);
    const ticket = await this.prisma.managementContactTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.managementContactMessage.create({
      data: { ticketId, senderUserId: user.id, content: dto.content.trim() },
    });
    await this.prisma.managementContactTicket.update({
      where: { id: ticketId },
      data: { status: 'ANSWERED' },
    });
    return message;
  }

  async updateTicketStatus(user: AuthenticatedUser, ticketId: string, status: TicketStatus) {
    this.requireSuperAdmin(user);
    if (!['OPEN', 'ANSWERED', 'CLOSED'].includes(status)) {
      throw new BadRequestException('Invalid ticket status');
    }
    const ticket = await this.prisma.managementContactTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.managementContactTicket.update({ where: { id: ticketId }, data: { status } });
  }

  private publicTicket(ticket: any) {
    return {
      id: ticket.id,
      studentId: ticket.studentId,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages?.map((message: any) => ({
        id: message.id,
        ticketId: message.ticketId,
        senderUserId: message.senderUserId,
        content: message.content,
        createdAt: message.createdAt,
      })) ?? [],
    };
  }
}
