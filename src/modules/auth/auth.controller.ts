import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import type { User } from '../../common/types/auth.types.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  setRefreshCookie,
} from '../../common/utils/refresh-cookie.util.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user', description: 'Role: Public' })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.register(dto);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Log in with user name or email',
    description: 'Role: Public',
  })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.login(dto);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Get new tokens with the refresh cookie',
    description: 'Role: Public',
  })
  @ApiCookieAuth(REFRESH_COOKIE)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.authService.refresh(req.cookies[REFRESH_COOKIE]);
    setRefreshCookie(res, refreshToken, refreshExpiresIn, this.isProduction());
    res.status(result.status).json(result);
  }

  @Public()
  @Post('logout')
  @ApiOperation({
    summary: 'Log out and end this session',
    description: 'Role: Public',
  })
  @ApiCookieAuth(REFRESH_COOKIE)
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.logout(req.cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.isProduction()));
    res.status(result.status).json(result);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get the logged-in user',
    description: 'Role: Logged in',
  })
  @ApiBearerAuth()
  async me(@Issuer() issuer: User, @Res() res: Response) {
    const result = await this.authService.me(issuer.id);
    res.status(result.status).json(result);
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
