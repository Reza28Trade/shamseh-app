import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateFileDto } from './dto/create-file.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('courses')
  listCourses(@Req() req: AuthenticatedRequest) {
    return this.coursesService.listCourses(req.user);
  }

  @Get('courses/:courseId')
  getCourse(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.coursesService.getCourse(req.user, courseId);
  }

  @Post('admin/courses')
  createCourse(@Req() req: AuthenticatedRequest, @Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(req.user, dto);
  }

  @Patch('admin/courses/:courseId')
  updateCourse(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(req.user, courseId, dto);
  }

  @Delete('admin/courses/:courseId')
  deleteCourse(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.coursesService.deleteCourse(req.user, courseId);
  }

  @Get('courses/:courseId/sessions')
  listSessions(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.coursesService.listSessions(req.user, courseId);
  }

  @Get('courses/:courseId/files')
  listCourseFiles(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) {
    return this.coursesService.listCourseFiles(req.user, courseId);
  }

  @Get('sessions/:sessionId/files')
  listSessionFiles(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.coursesService.listSessionFiles(req.user, sessionId);
  }

  @Post('admin/courses/:courseId/files')
  createCourseFile(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() dto: CreateFileDto) {
    return this.coursesService.createCourseFile(req.user, courseId, dto);
  }

  @Post('admin/sessions/:sessionId/files')
  createSessionFile(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string, @Body() dto: CreateFileDto) {
    return this.coursesService.createSessionFile(req.user, sessionId, dto);
  }

  @Delete('admin/files/:fileId')
  deleteFile(@Req() req: AuthenticatedRequest, @Param('fileId') fileId: string) {
    return this.coursesService.deleteFile(req.user, fileId);
  }

  @Post('admin/courses/:courseId/sessions')
  createSession(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() dto: CreateSessionDto) {
    return this.coursesService.createSession(req.user, courseId, dto);
  }

  @Patch('admin/sessions/:sessionId')
  updateSession(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string, @Body() dto: UpdateSessionDto) {
    return this.coursesService.updateSession(req.user, sessionId, dto);
  }

  @Delete('admin/sessions/:sessionId')
  deleteSession(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.coursesService.deleteSession(req.user, sessionId);
  }
}
