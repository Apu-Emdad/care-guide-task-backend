/**
 * Returns the field that broke a unique index (error code 11000), for example `email`.
 * Returns undefined when the error is not a duplicate key error.
 */
export function duplicateKeyField(error: unknown): string | undefined {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 11000
  ) {
    return undefined;
  }
  const keyPattern =
    'keyPattern' in error ? (error.keyPattern as object | null) : null;
  return Object.keys(keyPattern ?? {})[0] ?? 'email';
}

/** The conflict message for the field that broke a unique index. */
export function duplicateKeyMessage(field: string): string {
  return field === 'userName'
    ? 'Username is already taken'
    : 'Email is already registered';
}
