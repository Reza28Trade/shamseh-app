import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { SaveRulesDto } from './dto/save-rules.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { PublicContentService } from './public-content.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
export class PublicContentController {
  constructor(private readonly publicContentService: PublicContentService) {}

  @Get('public/courses')
  listPublicCourses() {
    return this.publicContentService.listPublicCourses();
  }

  @Get('public/courses/:courseId/cover')
  streamPublicCourseCover(@Param('courseId') courseId: string, @Res() res: Response) {
    return this.publicContentService.streamPublicCourseCover(courseId, res);
  }

  @Get('public/content/rules')
  getPublicRules() {
    return this.publicContentService.getPublicRules();
  }

  @Get('public/content/analyses')
  listPublishedAnalyses(@Query('year') year?: string, @Query('level') level?: string) {
    return this.publicContentService.listPublishedAnalyses({ year, level });
  }

  @UseGuards(AuthGuard)
  @Get('admin/public-content')
  listAdminContent(@Req() req: AuthenticatedRequest) {
    return this.publicContentService.listAdminContent(req.user);
  }

  @UseGuards(AuthGuard)
  @Put('admin/public-content/rules')
  saveRules(@Req() req: AuthenticatedRequest, @Body() dto: SaveRulesDto) {
    return this.publicContentService.saveRules(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Post('admin/public-content/analyses')
  createAnalysis(@Req() req: AuthenticatedRequest, @Body() dto: CreateAnalysisDto) {
    return this.publicContentService.createAnalysis(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('admin/public-content/analyses/:id')
  updateAnalysis(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateAnalysisDto) {
    return this.publicContentService.updateAnalysis(req.user, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('admin/public-content/analyses/:id')
  deleteAnalysis(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.publicContentService.deleteAnalysis(req.user, id);
  }
}
