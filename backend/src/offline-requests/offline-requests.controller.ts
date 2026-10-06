import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateOfflineRequestDto } from './dto/create-offline-request.dto';
import { ReviewOfflineRequestDto } from './dto/review-offline-request.dto';
import { UpdateOfflineRequestDto } from './dto/update-offline-request.dto';
import { OfflineRequestsService } from './offline-requests.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class OfflineRequestsController {
  constructor(private readonly offlineRequestsService: OfflineRequestsService) {}

  @Post('offline-requests')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOfflineRequestDto) {
    return this.offlineRequestsService.create(req.user, dto);
  }

  @Get('offline-requests')
  listMine(@Req() req: AuthenticatedRequest) {
    return this.offlineRequestsService.listMine(req.user);
  }

  @Get('admin/offline-requests')
  listAll(@Req() req: AuthenticatedRequest) {
    return this.offlineRequestsService.listAll(req.user);
  }

  @Patch('offline-requests/:requestId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateOfflineRequestDto,
  ) {
    return this.offlineRequestsService.update(req.user, requestId, dto);
  }

  @Delete('offline-requests/:requestId')
  remove(@Req() req: AuthenticatedRequest, @Param('requestId') requestId: string) {
    return this.offlineRequestsService.remove(req.user, requestId);
  }

  @Patch('admin/offline-requests/:requestId')
  review(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewOfflineRequestDto,
  ) {
    return this.offlineRequestsService.review(req.user, requestId, dto);
  }
}
