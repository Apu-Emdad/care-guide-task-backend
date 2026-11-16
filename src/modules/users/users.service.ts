import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model, type QueryFilter } from 'mongoose';
import type { Result } from '../../common/interfaces/result.interface.js';
import type { User } from '../../common/types/auth.types.js';
import { escapeRegex } from '../../common/utils/escape-regex.util.js';
import { toSafeUser } from '../../common/utils/safe-user.util.js';
import {
  duplicateKeyField,
  duplicateKeyMessage,
} from '../../infra/mongo/duplicate-key.js';
import { Note } from '../../infra/mongo/schemas/note.schema.js';
import { Post } from '../../infra/mongo/schemas/post.schema.js';
import { User as UserModel } from '../../infra/mongo/schemas/user.schema.js';
import { TokenService } from '../../infra/token/token.service.js';
import type {
  CreateUserDto,
  UpdateUserDto,
  UsersByInterestQueryDto,
  UsersQueryDto,
} from './users.dto.js';

/** Admin only: add, list, read, update and remove users. */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel.name) private readonly users: Model<UserModel>,
    @InjectModel(Note.name) private readonly notes: Model<Note>,
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    private readonly tokenService: TokenService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<Result> {
    try {
      const user = await this.users.create({
        userName: dto.userName,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: await argon2.hash(dto.password),
        role: dto.role,
        interests: dto.interests,
      });

      return {
        status: HttpStatus.CREATED,
        message: 'User created successfully',
        data: toSafeUser(user),
      };
    } catch (error) {
      const field = duplicateKeyField(error);
      if (field) throw new ConflictException(duplicateKeyMessage(field));
      throw error;
    }
  }

  async getUsers(query: UsersQueryDto): Promise<Result> {
    const filter: QueryFilter<UserModel> = {};

    if (query.search) {
      const search = { $regex: escapeRegex(query.search), $options: 'i' };
      filter.$or = [
        { userName: search },
        { fullName: search },
        { email: search },
      ];
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.interest) {
      filter.interests = query.interest;
    }

    const [total, users] = await Promise.all([
      this.users.countDocuments(filter),
      this.users
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize),
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Users fetched successfully',
      data: { total, users: users.map(toSafeUser) },
    };
  }

  async getUsersByInterest(query: UsersByInterestQueryDto): Promise<Result> {
    const skip = (query.page - 1) * query.pageSize;

    const filterInterst = query.interest
      ? [{ $match: { interests: query.interest } }]
      : [];

    const groups = await this.users.aggregate([
      ...filterInterst,
      // 1. one document per user and interest
      { $unwind: '$interests' },
      ...filterInterst,
      // 2. newest users first, so each group lists them in that order
      { $sort: { _id: -1 } },
      // 3. one group per interest, with its users and their count
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: {
            $push: {
              _id: '$_id',
              userName: '$userName',
              fullName: '$fullName',
              email: '$email',
            },
          },
        },
      },
      // 4. keeping one page of users in each group
      {
        $project: {
          _id: 0,
          interest: '$_id',
          count: 1,
          users: { $slice: ['$users', skip, query.pageSize] },
        },
      },
      // 5. most popular interests first
      { $sort: { count: -1, interest: 1 } },
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Users grouped by interest fetched successfully',
      data: groups,
    };
  }

  async getUser(id: string): Promise<Result> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return {
      status: HttpStatus.OK,
      message: 'User fetched successfully',
      data: toSafeUser(user),
    };
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    issuer: User,
  ): Promise<Result> {
    // an admin can't change their own role
    if (id === issuer.id && dto.role && dto.role !== issuer.role) {
      throw new ForbiddenException('You cannot change your own role');
    }

    try {
      const user = await this.users.findByIdAndUpdate(
        id,
        {
          userName: dto.userName,
          fullName: dto.fullName,
          email: dto.email,
          role: dto.role,
          interests: dto.interests,
        },
        { returnDocument: 'after', runValidators: true },
      );
      if (!user) throw new NotFoundException('User not found');

      return {
        status: HttpStatus.OK,
        message: 'User updated successfully',
        data: toSafeUser(user),
      };
    } catch (error) {
      const field = duplicateKeyField(error);
      if (field) throw new ConflictException(duplicateKeyMessage(field));
      throw error;
    }
  }

  async deleteUser(id: string, issuer: User): Promise<Result> {
    if (id === issuer.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    /**
     * MongoDB has no cascading deletes, so the user's notes, posts and sessions are
     * deleted here. A transaction deletes all of them or none.
     */
    await this.users.db.transaction(async (session) => {
      const user = await this.users.findByIdAndDelete(id, { session });
      if (!user) throw new NotFoundException('User not found');

      // One at a time: a transaction's session can't run operations in parallel
      await this.notes.deleteMany({ author: id }, { session });
      await this.posts.deleteMany({ author: id }, { session });
      await this.tokenService.revokeAll(id, session);
    });

    return { status: HttpStatus.OK, message: 'User deleted successfully' };
  }
}
