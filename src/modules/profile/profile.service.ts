import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import type { Result } from '../../common/interfaces/result.interface.js';
import {
  duplicateKeyField,
  duplicateKeyMessage,
} from '../../infra/mongo/duplicate-key.js';
import { User as UserModel } from '../../infra/mongo/schemas/user.schema.js';
import type { AuthResult, User } from '../../common/types/auth.types.js';
import { toSafeUser } from '../../common/utils/safe-user.util.js';
import { TokenService } from '../../infra/token/token.service.js';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(UserModel.name) private readonly users: Model<UserModel>,
    private readonly tokenService: TokenService,
  ) {}

  async updateProfile(issuer: User, dto: UpdateProfileDto): Promise<Result> {
    let updated;
    try {
      updated = await this.users.findByIdAndUpdate(
        issuer.id,
        { userName: dto.userName, fullName: dto.fullName, email: dto.email },
        { returnDocument: 'after' },
      );
    } catch (error) {
      const field = duplicateKeyField(error);
      if (field) throw new ConflictException(duplicateKeyMessage(field));
      throw error;
    }

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return {
      status: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: toSafeUser(updated),
    };
  }

  /**
   * Changes the password and ends every session
   */
  async changePassword(
    issuer: User,
    dto: ChangePasswordDto,
  ): Promise<AuthResult> {
    const user = await this.users.findById(issuer.id).select('+passwordHash');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await argon2.hash(dto.newPassword);

    // A transaction, so the password never changes while old sessions stay logged in
    const { tokens, ...refresh } = await this.users.db.transaction(
      async (session) => {
        await user.save({ session });
        await this.tokenService.revokeAll(user.id, session);
        return this.tokenService.issueTokens(user, session);
      },
    );

    return {
      ...refresh,
      result: {
        status: HttpStatus.OK,
        message: 'Password changed. Other sessions were logged out.',
        data: { ...tokens, user: toSafeUser(user) },
      },
    };
  }
}
