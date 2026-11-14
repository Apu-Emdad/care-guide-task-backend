import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ROLE } from '../../common/constants/roles.js';
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { User } from '../../common/types/auth.types.js';
import { UsersQueryDto } from './users.dto.js';
import { UsersService } from './users.service.js';

@ApiBearerAuth()
@ApiTags('Users')
@Roles(ROLE.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(@Query() query: UsersQueryDto, @Res() res: Response) {
    const result = await this.usersService.getUsers(query);
    res.status(result.status).json(result);
  }

  @Get(':uid')
  async getUser(@Param('uid') uid: string, @Res() res: Response) {
    const result = await this.usersService.getUser(uid);
    res.status(result.status).json(result);
  }

  @Patch('deactivate/:uid')
  async deactivateUser(
    @Param('uid') uid: string,
    @Issuer() issuer: User,
    @Res() res: Response,
  ) {
    const result = await this.usersService.deactivateUser(uid, issuer);
    res.status(result.status).json(result);
  }

  @Delete(':uid')
  async deleteUser(
    @Param('uid') uid: string,
    @Issuer() issuer: User,
    @Res() res: Response,
  ) {
    const result = await this.usersService.deleteUser(uid, issuer);
    res.status(result.status).json(result);
  }
}
