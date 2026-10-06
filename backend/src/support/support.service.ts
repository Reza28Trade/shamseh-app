import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }
    return user.studentId;
  }

  private requireStaff(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Staff access required');
    }
  }

  async createTicket(user: AuthenticatedUser, dto: CreateTicketDto) {
    const studentId = this.requireStudent(user);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        studentId,
        subject: dto.subject,
        messages: {
          create: {
            senderUserId: user.id,
            content: dto.content,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return this.publicTicket(ticket);
  }

  async listStudentTickets(user: AuthenticatedUser) {
    const studentId = this.requireStudent(user);
    const tickets = await this.prisma.supportTicket.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return tickets.map((ticket) => this.publicTicket(ticket));
  }

  async listStaffTickets(user: AuthenticatedUser) {
    this.requireStaff(user);
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return tickets.map((ticket) => ({
      ...this.publicTicket(ticket),
      student: ticket.student,
    }));
  }

  async addStudentMessage(user: AuthenticatedUser, ticketId: string, dto: CreateMessageDto) {
    const studentId = this.requireStudent(user);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, studentId },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.supportMessage.create({
      data: { ticketId, senderUserId: user.id, content: dto.content },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' },
    });

    return message;
  }

  async addStaffMessage(user: AuthenticatedUser, ticketId: string, dto: CreateMessageDto) {
    this.requireStaff(user);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.supportMessage.create({
      data: { ticketId, senderUserId: user.id, content: dto.content },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'ANSWERED' },
    });

    return message;
  }

  async updateTicketStatus(
    user: AuthenticatedUser,
    ticketId: string,
    status: 'OPEN' | 'ANSWERED' | 'CLOSED',
  ) {
    this.requireStaff(user);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
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
