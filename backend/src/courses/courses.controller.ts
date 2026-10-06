import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';
const { diskStorage } = require('multer');
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateFileDto } from './dto/create-file.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

const uploadDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';

function ensureUploadDirectory() {
  mkdirSync(uploadDirectory, { recursive: true });
  return uploadDirectory;
}

function uploadedFilename(_req: Request, file: any) {
  return `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
}

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
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => cb(null, ensureUploadDirectory()),
      filename: uploadedFilename,
    }),
    limits: { fileSize: 100 * 1024 * 1024 },
  }))
  createCourseFile(
    @Req() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() dto: CreateFileDto,
    @UploadedFile() file: any,
  ) {
    return this.coursesService.createUploadedCourseFile(req.user, courseId, dto, file);
  }

  @Post('admin/sessions/:sessionId/files')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => cb(null, ensureUploadDirectory()),
      filename: uploadedFilename,
    }),
    limits: { fileSize: 100 * 1024 * 1024 },
  }))
  createSessionFile(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateFileDto,
    @UploadedFile() file: any,
  ) {
    return this.coursesService.createUploadedSessionFile(req.user, sessionId, dto, file);
  }

  @Post('admin/courses/:courseId/files/link')
  createCourseLink(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() dto: CreateFileDto) {
    return this.coursesService.createCourseFile(req.user, courseId, dto);
  }

  @Post('admin/sessions/:sessionId/files/link')
  createSessionLink(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string, @Body() dto: CreateFileDto) {
    return this.coursesService.createSessionFile(req.user, sessionId, dto);
  }

  @Get('files/:fileId/stream')
  downloadFile(@Req() req: AuthenticatedRequest, @Param('fileId') fileId: string, @Res() res: Response) {
    return this.coursesService.streamFile(req.user, fileId, res);
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
