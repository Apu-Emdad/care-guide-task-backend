import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  setRefreshCookie,
} from './refresh-cookie.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.register(dto);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.login(dto);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('refresh')
  @ApiCookieAuth(REFRESH_COOKIE)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.refresh(req.cookies[REFRESH_COOKIE]);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('logout')
  @ApiCookieAuth(REFRESH_COOKIE)
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.logout(req.cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.isProduction()));
    res.status(result.status).json(result);
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() authUser: AuthUser, @Res() res: Response) {
    const result = await this.authService.me(authUser.uid);
    res.status(result.status).json(result);
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
