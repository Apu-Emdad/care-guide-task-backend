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

// Author fields shown with a post
const AUTHOR_FIELDS = 'userName fullName';

/**
 * Posts
 *
 * Every logged-in user can read all posts. Only the author can update or delete a post,
 * and that includes admins: an admin can't change another user's post.
 */
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
    // 1. building the filter
    const filter: QueryFilter<Post> = {};

    // Case-insensitive match in title or content
    if (query.search) {
      const search = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [{ title: search }, { content: search }];
    }

    // 2. fetching the posts, newest first. Sorting by _id uses the default index.
    const [total, posts] = await Promise.all([
      this.posts.countDocuments(filter),
      this.posts
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .populate('author', AUTHOR_FIELDS),
    ]);

    // 3. returning the result
    return {
      status: HttpStatus.OK,
      message: 'Posts fetched successfully',
      data: { posts, total },
    };
  }

  /**
   * One user's posts, newest first, in one aggregation pipeline with a $lookup.
   *
   * The pipeline starts from the user and joins their posts on `posts.author`. The
   * `{ author, _id }` index on posts serves that join and the newest-first sort. $facet
   * returns one page of posts and the total count from the same pipeline.
   */
  async getUserPosts(
    userId: string,
    query: UserPostsQueryDto,
  ): Promise<Result> {
    const [result] = await this.users.aggregate<{
      user: { _id: Types.ObjectId; userName: string; fullName: string };
      posts: Post[];
      total: number;
    }>([
      // 1. the user (default _id index). aggregate() does not cast, so the id must be an ObjectId
      { $match: { _id: new Types.ObjectId(userId) } },
      // 2. joining their posts: newest first, then one page and the total
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          pipeline: [
            { $sort: { _id: -1 } },
            {
              $facet: {
                posts: [
                  { $skip: (query.page - 1) * query.pageSize },
                  { $limit: query.pageSize },
                  { $project: { author: 0 } },
                ],
                total: [{ $count: 'count' }],
              },
            },
          ],
          as: 'page',
        },
      },
      // 3. $facet always gives one document, so this keeps the user
      { $unwind: '$page' },
      // 4. the response shape
      {
        $project: {
          _id: 0,
          user: { _id: '$_id', userName: '$userName', fullName: '$fullName' },
          posts: '$page.posts',
          total: { $ifNull: [{ $first: '$page.total.count' }, 0] },
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
      .populate('author', AUTHOR_FIELDS);
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
    // 1. finding the post and checking the author
    const post = await this.posts.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (!post.author.equals(issuer.id)) {
      throw new ForbiddenException('You can only change your own posts');
    }

    // 2. saving
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
    // 1. finding the post and checking the author
    const post = await this.posts.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (!post.author.equals(issuer.id)) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // 2. deleting
    await post.deleteOne();

    return { status: HttpStatus.OK, message: 'Post deleted successfully' };
  }
}
