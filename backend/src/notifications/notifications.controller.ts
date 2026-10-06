import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  listForStudent(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.listForStudent(req.user);
  }

  @Post('notifications/:notificationId/read')
  markRead(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markRead(req.user, notificationId);
  }

  @Post('admin/notifications')
  createNotification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.createNotification(req.user, dto);
  }
}
