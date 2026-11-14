import type { UserDocument } from '../../infra/mongo/schemas/user.schema.js';

// Only safe fields leave the API: no password hash.
export const toSafeUser = (user: UserDocument) => ({
  id: user.id,
  userName: user.userName,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  interests: user.interests,
  createdAt: user.createdAt,
});
