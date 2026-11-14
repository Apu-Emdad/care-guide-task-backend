import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import type { Result } from '../../common/interfaces/result.interface.js';
import {
  duplicateKeyField,
  duplicateKeyMessage,
} from '../../infra/mongo/duplicate-key.js';
import {
  User,
  type UserDocument,
} from '../../infra/mongo/schemas/user.schema.js';
import type { AuthResult } from '../../common/types/auth.types.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { TokenService } from '../../infra/token/token.service.js';
import { toSafeUser } from '../../common/utils/safe-user.util.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    let user: UserDocument;
    try {
      user = await this.users.create({
        userName: dto.userName,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: await argon2.hash(dto.password),
      });
    } catch (error) {
      // The unique indexes on email and userName reject a second user with the same value
      const field = duplicateKeyField(error);
      if (field) throw new ConflictException(duplicateKeyMessage(field));
      throw error;
    }

    const { tokens, ...refresh } = await this.tokenService.issueTokens(user);
    return {
      ...refresh,
      result: {
        status: HttpStatus.CREATED,
        message: 'Registration successful',
        data: { ...tokens, user: toSafeUser(user) },
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    // The password hash is hidden by default, so it is asked for here
    // User names can't contain "@", so a value with "@" is an email.
    const filter = dto.userNameOrEmail.includes('@')
      ? { email: dto.userNameOrEmail }
      : { userName: dto.userNameOrEmail };
    const user = await this.users.findOne(filter).select('+passwordHash');

    // Same message for an unknown user and a wrong password, so accounts can't be discovered.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid username, email or password');
    }

    const { tokens, ...refresh } = await this.tokenService.issueTokens(user);
    return {
      ...refresh,
      result: {
        status: HttpStatus.OK,
        message: 'Login successful',
        data: { ...tokens, user: toSafeUser(user) },
      },
    };
  }

  // Uses up the refresh token from the cookie and issues a new pair (rotation).
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const id = await this.tokenService.consume(refreshToken);

    const user = await this.users.findById(id);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const { tokens, ...refresh } = await this.tokenService.issueTokens(user);
    return {
      ...refresh,
      result: {
        status: HttpStatus.OK,
        message: 'Access token refreshed',
        data: { ...tokens, user: toSafeUser(user) },
      },
    };
  }

  async logout(refreshToken: string | undefined): Promise<Result> {
    await this.tokenService.revoke(refreshToken);

    return { status: HttpStatus.OK, message: 'Logged out' };
  }

  async me(id: string): Promise<Result> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      status: HttpStatus.OK,
      message: 'Current user fetched successfully',
      data: toSafeUser(user),
    };
  }
}
