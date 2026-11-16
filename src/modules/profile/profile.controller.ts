import { Body, Controller, Patch, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import type { Env } from '../../config/env.js';
import type { User } from '../../common/types/auth.types.js';
import { setRefreshCookie } from '../../common/utils/refresh-cookie.util.js';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiBearerAuth()
@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Patch()
  @ApiOperation({ summary: 'Update my user name, full name or email' })
  async updateProfile(
    @Issuer() issuer: User,
    @Body() dto: UpdateProfileDto,
    @Res() res: Response,
  ) {
    const result = await this.profileService.updateProfile(issuer, dto);
    res.status(result.status).json(result);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change my password and log out other sessions' })
  async changePassword(
    @Issuer() issuer: User,
    @Body() dto: ChangePasswordDto,
    @Res() res: Response,
  ) {
    const { result, refreshToken, refreshExpiresIn } =
      await this.profileService.changePassword(issuer, dto);
    setRefreshCookie(
      res,
      refreshToken,
      refreshExpiresIn,
      this.config.get('NODE_ENV', { infer: true }) === 'production',
    );
    res.status(result.status).json(result);
  }
}
