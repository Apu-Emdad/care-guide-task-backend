import type { UserRole } from '../../infra/mongo/schemas/user.schema.js';

// Claims inside the access token.
export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
}

// Claims inside the refresh token. `jti` is the session id in MongoDB.
export interface RefreshPayload {
  sub: string; // user id
  jti: string;
}
