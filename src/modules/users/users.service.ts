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
      // The unique indexes reject an email or user name that another user has
      const field = duplicateKeyField(error);
      if (field) throw new ConflictException(duplicateKeyMessage(field));
      throw error;
    }
  }

  async getUsers(query: UsersQueryDto): Promise<Result> {
    // 1. building the filter
    const filter: QueryFilter<UserModel> = {};

    // Case-insensitive match in user name, full name or email
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

    // 2. fetching the users, newest first. Sorting by _id uses the default index.
    const [total, users] = await Promise.all([
      this.users.countDocuments(filter),
      this.users
        .find(filter)
        .sort({ _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize),
    ]);

    // 3. returning the result
    return {
      status: HttpStatus.OK,
      message: 'Users fetched successfully',
      data: { users: users.map(toSafeUser), total },
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
    // An admin can't change their own role, so the app never loses its last admin by mistake
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
    // 1. an admin can't delete their own account
    if (id === issuer.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // 2. deleting the user
    const user = await this.users.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');

    // 3. deleting their notes and posts, and logging them out everywhere
    await Promise.all([
      this.notes.deleteMany({ author: id }),
      this.posts.deleteMany({ author: id }),
      this.tokenService.revokeAll(id),
    ]);

    return { status: HttpStatus.OK, message: 'User deleted successfully' };
  }
}
