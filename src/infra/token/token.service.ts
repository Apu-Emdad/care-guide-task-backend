import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type ClientSession } from 'mongoose';
import type { Env } from '../../config/env.js';
import { RefreshToken } from '../mongo/schemas/refresh-token.schema.js';
import type { UserDocument } from '../mongo/schemas/user.schema.js';
import type { JwtPayload, RefreshPayload } from './token.types.js';

export interface TokenPair {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

/**
 * Issues access and refresh tokens and keeps refresh sessions in MongoDB.
 *
 * Each login creates one document in `refresh_tokens`. Its `_id` is the session id
 * (`jti`), which is also inside the refresh token. Only a SHA-256 hash of the token
 * is stored, never the token itself.
 * - Rotation: a refresh token works once; using it deletes its session and issues a new pair.
 * - Reuse detection: a valid token whose session is already gone was used before
 *   (likely stolen), so every session of that user is revoked.
 * - Logout deletes the session, so the token stops working immediately.
 * - Expiry: MongoDB removes expired sessions with a TTL index, but that can run up to a
 *   minute late, so `expiresAt` is also checked in code.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshToken>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // `tokens` goes in the response data; the refresh token only goes in the cookie.
  async issueTokens(user: UserDocument, session?: ClientSession) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const issued = await this.issue(payload, session);

    return {
      refreshToken: issued.refreshToken,
      refreshExpiresIn: issued.refreshExpiresIn,
      tokens: {
        accessToken: issued.accessToken,
        tokenType: 'Bearer',
        expiresIn: issued.accessExpiresIn,
      },
    };
  }

  private async issue(
    payload: JwtPayload,
    session?: ClientSession,
  ): Promise<TokenPair> {
    const accessExpiresIn = this.config.get('JWT_ACCESS_EXPIRES_IN', {
      infer: true,
    });
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    });
    const jti = randomUUID();
    const refreshPayload: RefreshPayload = { sub: payload.sub, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    await new this.refreshTokens({
      _id: jti,
      userId: new Types.ObjectId(payload.sub),
      tokenHash: this.hash(refreshToken),
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    }).save({ session });

    return { accessToken, accessExpiresIn, refreshToken, refreshExpiresIn };
  }

  /**
   * Checks a refresh token and uses it up.
   * Returns the user's id; the caller issues the new pair.
   */
  async consume(refreshToken: string | undefined): Promise<string> {
    const payload = await this.verify(refreshToken);
    if (!refreshToken || !payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // One atomic step: only the first request can delete the session
    const session = await this.refreshTokens.findOneAndDelete({
      _id: payload.jti,
      tokenHash: this.hash(refreshToken),
    });
    if (!session) {
      await this.revokeAll(payload.sub);
      throw new UnauthorizedException(
        'Refresh token was already used; please log in again',
      );
    }

    // The TTL index can be up to a minute late
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return payload.sub;
  }

  // Logout: deletes the token's session. An invalid or missing token is ignored.
  async revoke(refreshToken: string | undefined): Promise<void> {
    const payload = await this.verify(refreshToken);
    if (payload) await this.refreshTokens.deleteOne({ _id: payload.jti });
  }

  // Ends every session of a user (password change, user delete, token reuse).
  async revokeAll(userId: string, session?: ClientSession): Promise<void> {
    await this.refreshTokens.deleteMany(
      { userId: new Types.ObjectId(userId) },
      { session },
    );
  }

  private async verify(
    refreshToken: string | undefined,
  ): Promise<RefreshPayload | null> {
    if (!refreshToken) return null;
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      return null;
    }
  }

  private hash(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
