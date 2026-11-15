import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ROLE } from '../../common/constants/roles.js';
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import type { User } from '../../common/types/auth.types.js';
import { CreateUserDto, UpdateUserDto, UsersQueryDto } from './users.dto.js';
import { UsersService } from './users.service.js';

@ApiBearerAuth()
@ApiTags('Users')
@Roles(ROLE.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto, @Res() res: Response) {
    const result = await this.usersService.createUser(dto);
    res.status(result.status).json(result);
  }

  @Get()
  async getUsers(@Query() query: UsersQueryDto, @Res() res: Response) {
    const result = await this.usersService.getUsers(query);
    res.status(result.status).json(result);
  }

  @Get(':id')
  async getUser(
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.usersService.getUser(id);
    res.status(result.status).json(result);
  }

  @Patch(':id')
  async updateUser(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Issuer() issuer: User,
    @Res() res: Response,
  ) {
    const result = await this.usersService.updateUser(id, dto, issuer);
    res.status(result.status).json(result);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseObjectIdPipe) id: string,
    @Issuer() issuer: User,
    @Res() res: Response,
  ) {
    const result = await this.usersService.deleteUser(id, issuer);
    res.status(result.status).json(result);
  }
}
