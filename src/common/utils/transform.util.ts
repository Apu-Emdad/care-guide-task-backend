import type { TransformFnParams } from 'class-transformer';

// Use with @Transform(trimmed): removes spaces at both ends of a string.
export const trimmed = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Use with @Transform(toLowerTrimmed): trims a string and makes it lower case.
export const toLowerTrimmed = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Use with @Transform(toBoolean) on a query param.
 * Query params arrive as strings: '' means not set, 'true'/'false' become booleans.
 */
export const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
