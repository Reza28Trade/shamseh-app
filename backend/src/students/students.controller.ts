import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateStudentDto } from './dto/create-student.dto';
import { ResetStudentPasswordDto } from './dto/reset-student-password.dto';
import { StudentsService } from './students.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('admin/students')
  listStudents(@Req() req: AuthenticatedRequest) {
    return this.studentsService.listStudents(req.user);
  }

  @Post('admin/students')
  createStudent(@Req() req: AuthenticatedRequest, @Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(req.user, dto);
  }

  @Patch('admin/students/:studentId/password')
  resetPassword(@Req() req: AuthenticatedRequest, @Param('studentId') studentId: string, @Body() dto: ResetStudentPasswordDto) {
    return this.studentsService.resetPassword(req.user, studentId, dto);
  }

  @Post('admin/students/:studentId/enrollments/:courseId')
  enroll(@Req() req: AuthenticatedRequest, @Param('studentId') studentId: string, @Param('courseId') courseId: string) {
    return this.studentsService.enroll(req.user, studentId, courseId);
  }

  @Patch('admin/enrollments/:enrollmentId')
  updateEnrollment(
    @Req() req: AuthenticatedRequest,
    @Param('enrollmentId') enrollmentId: string,
    @Body('status') status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  ) {
    return this.studentsService.updateEnrollment(req.user, enrollmentId, status);
  }

  @Get('student/enrollments')
  myEnrollments(@Req() req: AuthenticatedRequest) {
    return this.studentsService.myEnrollments(req.user);
  }
}
