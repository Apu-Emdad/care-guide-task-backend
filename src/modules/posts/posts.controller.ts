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
import { Issuer } from '../../common/decorators/issuer.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import type { User } from '../../common/types/auth.types.js';
import {
  CreatePostDto,
  PostsQueryDto,
  UpdatePostDto,
  UserPostsQueryDto,
} from './posts.dto.js';
import { PostsService } from './posts.service.js';

@ApiBearerAuth()
@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @Issuer() issuer: User,
    @Body() dto: CreatePostDto,
    @Res() res: Response,
  ) {
    const result = await this.postsService.create(issuer, dto);
    res.status(result.status).json(result);
  }

  @Get()
  async getPosts(@Query() query: PostsQueryDto, @Res() res: Response) {
    const result = await this.postsService.getPosts(query);
    res.status(result.status).json(result);
  }

  @Get('user/:userId')
  async getUserPosts(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: UserPostsQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.postsService.getUserPosts(userId, query);
    res.status(result.status).json(result);
  }

  @Get(':id')
  async getPost(
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.postsService.getPost(id);
    res.status(result.status).json(result);
  }

  @Patch(':id')
  async updatePost(
    @Issuer() issuer: User,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePostDto,
    @Res() res: Response,
  ) {
    const result = await this.postsService.updatePost(issuer, id, dto);
    res.status(result.status).json(result);
  }

  @Delete(':id')
  async deletePost(
    @Issuer() issuer: User,
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.postsService.deletePost(issuer, id);
    res.status(result.status).json(result);
  }
}
