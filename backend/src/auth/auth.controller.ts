import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sessionToken);
    response.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
    return { success: true };
  }
}
