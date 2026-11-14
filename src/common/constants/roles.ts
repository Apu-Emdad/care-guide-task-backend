/**
 * Role names, as stored in users.role.
 * Use these instead of plain strings, e.g. @Roles(ROLE.ADMIN).
 */
export const ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];
