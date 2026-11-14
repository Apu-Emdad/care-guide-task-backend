// Escapes regex characters, so user text is matched as plain text.
export const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
