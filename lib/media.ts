// Stored files are served at /api/media/<folder>/<24-char id>.<ext>. Shared by server code and tests.
export const MEDIA_KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9_-]{24}\.[a-z0-9]+$/;

/** Storage keys of every /api/media file a book (or any JSON value) points at. */
export function mediaKeysIn(value: unknown): string[] {
  const keys = new Set<string>();
  for (const m of JSON.stringify(value ?? null).matchAll(/\/api\/media\/([a-z0-9-]+\/[A-Za-z0-9_-]{24}\.[a-z0-9]+)/g)) keys.add(m[1]);
  return [...keys];
}
