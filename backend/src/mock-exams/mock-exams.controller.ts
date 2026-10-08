import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { UpdateMockExamDto } from './dto/update-mock-exam.dto';
import { MockExamsService } from './mock-exams.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
export class MockExamsController {
  constructor(private readonly mockExamsService: MockExamsService) {}

  @Get('mock-exams')
  listPublic() {
    return this.mockExamsService.listPublic();
  }

  @Get('mock-exams/:mockExamId')
  getPublic(@Param('mockExamId') mockExamId: string) {
    return this.mockExamsService.getPublic(mockExamId);
  }

  @UseGuards(AuthGuard)
  @Get('student/mock-exams')
  listForStudent(@Req() req: AuthenticatedRequest) {
    return this.mockExamsService.listForStudent(req.user);
  }

  @UseGuards(AuthGuard)
  @Get('admin/mock-exams')
  listForAdmin(@Req() req: AuthenticatedRequest) {
    return this.mockExamsService.listForAdmin(req.user);
  }

  @UseGuards(AuthGuard)
  @Post('admin/mock-exams')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateMockExamDto) {
    return this.mockExamsService.create(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('admin/mock-exams/:mockExamId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('mockExamId') mockExamId: string,
    @Body() dto: UpdateMockExamDto,
  ) {
    return this.mockExamsService.update(req.user, mockExamId, dto);
  }

  @UseGuards(AuthGuard)
  @Get('admin/mock-exams/:mockExamId/participants')
  listParticipants(
    @Req() req: AuthenticatedRequest,
    @Param('mockExamId') mockExamId: string,
  ) {
    return this.mockExamsService.listParticipants(req.user, mockExamId);
  }

  @UseGuards(AuthGuard)
  @Post('admin/mock-exams/:mockExamId/participants/:studentId')
  addParticipant(
    @Req() req: AuthenticatedRequest,
    @Param('mockExamId') mockExamId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.mockExamsService.addParticipant(
      req.user,
      mockExamId,
      studentId,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('admin/mock-exams/:mockExamId/participants/:studentId')
  removeParticipant(
    @Req() req: AuthenticatedRequest,
    @Param('mockExamId') mockExamId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.mockExamsService.removeParticipant(
      req.user,
      mockExamId,
      studentId,
    );
  }
}
