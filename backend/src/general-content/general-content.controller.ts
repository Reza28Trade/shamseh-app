import { BadRequestException, Body, Controller, Get, Patch, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
const { memoryStorage } = require('multer');
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { GeneralContentService } from './general-content.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('content')
export class GeneralContentController {
  constructor(private readonly generalContentService: GeneralContentService) {}

  @Get('news')
  getNews() {
    return this.generalContentService.getNews();
  }

  @Get('admin/news')
  @UseGuards(AuthGuard)
  getAdminNews(@Req() req: AuthenticatedRequest) {
    return this.generalContentService.getAdminNews(req.user);
  }

  @Post('news/image')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadNewsImage(@Req() req: AuthenticatedRequest, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('لطفاً یک فایل تصویر انتخاب کنید.');
    return this.generalContentService.saveNewsImage(req.user, file);
  }

  @Get('news/images/:filename')
  getNewsImage(@Param('filename') filename: string, @Res() res: Response) {
    return this.generalContentService.getNewsImage(filename, res);
  }

  @Patch('news')
  @UseGuards(AuthGuard)
  updateNews(@Req() req: AuthenticatedRequest, @Body('content') content: string) {
    return this.generalContentService.updateNews(req.user, content);
  }

  @Get('rules')
  getRules() {
    return this.generalContentService.getRules();
  }

  @Patch('rules')
  @UseGuards(AuthGuard)
  updateRules(@Req() req: AuthenticatedRequest, @Body('content') content: string) {
    return this.generalContentService.updateRules(req.user, content);
  }
}
