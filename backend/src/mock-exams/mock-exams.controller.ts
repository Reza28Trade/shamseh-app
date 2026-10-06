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
  @Post('mock-exams/:mockExamId/register')
  register(@Req() req: AuthenticatedRequest, @Param('mockExamId') mockExamId: string) {
    return this.mockExamsService.register(req.user, mockExamId);
  }

  @UseGuards(AuthGuard)
  @Delete('mock-exams/:mockExamId/register')
  cancelRegistration(@Req() req: AuthenticatedRequest, @Param('mockExamId') mockExamId: string) {
    return this.mockExamsService.cancelRegistration(req.user, mockExamId);
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
}
