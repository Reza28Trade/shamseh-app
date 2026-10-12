import { Body, Controller, Get, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Response } from 'express';
const { memoryStorage } = require('multer');
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

  @Post('counseling/conversations/:id/messages/attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadAttachment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('content') content: string | undefined,
    @UploadedFile() file: any,
  ) {
    return this.chat.storeAndSendAttachment(req.user, id, content || '', file);
  }

  @Get('counseling/conversations/:id/messages/:messageId/attachment')
  async downloadAttachment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Res() res: Response,
  ) {
    const file = await this.chat.getAttachmentForDownload(req.user, id, messageId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return createReadStream(file.path).pipe(res);
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
