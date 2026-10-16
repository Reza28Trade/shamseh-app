import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './session.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './auth.types';
import { AUTH_COOKIE_NAME } from './auth.constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.username, body.password);

    response.cookie(AUTH_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.maxAgeMs,
      path: '/',
    });

    return { user: result.user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    const { sessionToken: _sessionToken, ...publicUser } = user;
    return { user: publicUser };
  }


  @UseGuards(AuthGuard)
  @Get('admin/admins')
  listAdmins(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listAdmins(user);
  }

  @UseGuards(AuthGuard)
  @Post('admin/admins')
  createAdmin(@CurrentUser() user: AuthenticatedUser, @Body() body: { username: string; password: string; permissions?: string[] }) {
    return this.authService.createAdmin(user, body);
  }

  @UseGuards(AuthGuard)
  @Patch('admin/admins/:id')
  updateAdmin(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { username?: string; password?: string; permissions?: string[]; status?: 'ACTIVE' | 'INACTIVE' }) {
    return this.authService.updateAdmin(user, id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('admin/account/password')
  changeOwnPassword(@CurrentUser() user: AuthenticatedUser, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changeOwnPassword(user, body);
  }

  // Logout must also work when the session is expired or the guard cannot validate it.
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const sessionToken = request.cookies?.[AUTH_COOKIE_NAME];

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    response.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }
}
