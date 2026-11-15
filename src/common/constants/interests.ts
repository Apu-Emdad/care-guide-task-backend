/**
 * The interests a user can pick, as stored in users.interests.
 * Aggregation 1 groups users by these values.
 */
export const INTEREST = {
  MUSIC: 'MUSIC',
  TRAVEL: 'TRAVEL',
  SPORTS: 'SPORTS',
  READING: 'READING',
  MOVIES: 'MOVIES',
} as const;

export type InterestName = (typeof INTEREST)[keyof typeof INTEREST];
