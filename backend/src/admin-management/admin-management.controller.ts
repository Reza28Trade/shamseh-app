import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { AdminManagementService } from './admin-management.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class AdminManagementController {
  constructor(private readonly service: AdminManagementService) {}

  @Get('admin/admins')
  list(@Req() req: AuthenticatedRequest) {
    return this.service.list(req.user);
  }

  @Post('admin/admins')
  create(@Req() req: AuthenticatedRequest, @Body() body: { username: string; password: string; permissions?: string[] }) {
    return this.service.create(req.user, body);
  }

  @Patch('admin/admins/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { username?: string; password?: string; permissions?: string[]; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    return this.service.update(req.user, id, body);
  }

  @Patch('admin/account/password')
  changeOwnPassword(@Req() req: AuthenticatedRequest, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.service.changeOwnPassword(req.user, body);
  }
}
