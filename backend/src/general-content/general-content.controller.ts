import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
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
