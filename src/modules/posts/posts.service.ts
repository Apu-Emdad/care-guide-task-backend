import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type QueryFilter } from 'mongoose';
import type { Result } from '../../common/interfaces/result.interface.js';
import type { User } from '../../common/types/auth.types.js';
import { escapeRegex } from '../../common/utils/escape-regex.util.js';
import { Post } from '../../infra/mongo/schemas/post.schema.js';
import { User as UserModel } from '../../infra/mongo/schemas/user.schema.js';
import type {
  CreatePostDto,
  PostsQueryDto,
  UpdatePostDto,
  UserPostsQueryDto,
} from './posts.dto.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(UserModel.name) private readonly users: Model<UserModel>,
  ) {}

  async create(issuer: User, dto: CreatePostDto): Promise<Result> {
    const post = await this.posts.create({
      title: dto.title,
      content: dto.content,
      author: issuer.id,
    });

    return {
      status: HttpStatus.CREATED,
      message: 'Post created successfully',
      data: post,
    };
  }

  async getPosts(query: PostsQueryDto): Promise<Result> {
    const filter: QueryFilter<Post> = {};

    if (query.search) {
      const search = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [{ title: search }, { content: search }];
    }

    const [total, posts] = await Promise.all([
      this.posts.countDocuments(filter),
      this.posts
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .populate('author', 'userName fullName'),
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Posts fetched successfully',
      data: { total, posts },
    };
  }

  /**
   * One user's posts, newest first, in one aggregation pipeline with a $lookup.
   */
  async getUserPosts(
    userId: string,
    query: UserPostsQueryDto,
  ): Promise<Result> {
    const [result] = await this.users.aggregate<{
      user: { _id: Types.ObjectId; userName: string; fullName: string };
      total: number;
      posts: Post[];
    }>([
      { $match: { _id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          pipeline: [
            { $sort: { _id: -1 } },
            {
              $facet: {
                total: [{ $count: 'count' }],
                posts: [
                  { $skip: (query.page - 1) * query.pageSize },
                  { $limit: query.pageSize },
                  { $project: { author: 0 } },
                ],
              },
            },
          ],
          as: 'page',
        },
      },
      { $unwind: '$page' },
      {
        $project: {
          _id: 0,
          user: { _id: '$_id', userName: '$userName', fullName: '$fullName' },
          total: { $ifNull: [{ $first: '$page.total.count' }, 0] },
          posts: '$page.posts',
        },
      },
    ]);

    if (!result) throw new NotFoundException('User not found');

    return {
      status: HttpStatus.OK,
      message: 'Posts fetched successfully',
      data: result,
    };
  }

  async getPost(id: string): Promise<Result> {
    const post = await this.posts
      .findById(id)
      .populate('author', 'userName fullName');
    if (!post) throw new NotFoundException('Post not found');

    return {
      status: HttpStatus.OK,
      message: 'Post fetched successfully',
      data: post,
    };
  }

  async updatePost(
    issuer: User,
    id: string,
    dto: UpdatePostDto,
  ): Promise<Result> {
    const post = await this.posts.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (!post.author.equals(issuer.id)) {
      throw new ForbiddenException('You can only change your own posts');
    }

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    await post.save();

    return {
      status: HttpStatus.OK,
      message: 'Post updated successfully',
      data: post,
    };
  }

  async deletePost(issuer: User, id: string): Promise<Result> {
    const post = await this.posts.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (!post.author.equals(issuer.id)) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await post.deleteOne();

    return { status: HttpStatus.OK, message: 'Post deleted successfully' };
  }
}
