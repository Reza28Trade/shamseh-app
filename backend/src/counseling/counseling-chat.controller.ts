import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CounselingChatService } from './counseling-chat.service';
import {
  AssignCounselorDto,
  CreateCounselorDto,
  SendCounselingMessageDto,
  SetCounselorActiveDto,
} from './dto/counseling-chat.dto';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class CounselingChatController {
  constructor(private readonly chat: CounselingChatService) {}

  @Get('admin/counselors')
  listCounselors(@Req() req: AuthRequest) {
    return this.chat.listCounselors(req.user);
  }

  @Post('admin/counselors')
  createCounselor(@Req() req: AuthRequest, @Body() body: CreateCounselorDto) {
    return this.chat.createCounselor(req.user, body);
  }

  @Patch('admin/counselors/:id')
  setCounselorActive(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: SetCounselorActiveDto,
  ) {
    return this.chat.setCounselorActive(req.user, id, body.isActive);
  }

  @Post('admin/counseling/assignments')
  assign(@Req() req: AuthRequest, @Body() body: AssignCounselorDto) {
    return this.chat.assignStudent(req.user, body.studentId, body.counselorId);
  }

  @Get('admin/counseling/assignments')
  assignments(@Req() req: AuthRequest) {
    return this.chat.listAssignments(req.user);
  }

  @Get('counseling/conversations')
  conversations(@Req() req: AuthRequest) {
    return this.chat.listConversations(req.user);
  }

  @Get('counseling/conversations/:id/messages')
  messages(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.chat.getMessages(req.user, id);
  }

  @Post('counseling/conversations/:id/messages')
  send(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: SendCounselingMessageDto,
  ) {
    return this.chat.sendMessage(req.user, id, body.content);
  }
}
