/**
 * Convert an arbitrary string into a filesystem-safe filename component.
 *
 * Rules:
 *  - Allowed characters pass through unchanged: ASCII letters, digits, `-`, `_`
 *  - Everything else (spaces, punctuation, unicode, path traversal, etc.) is
 *    replaced with a single underscore per character — chosen for visual
 *    correspondence (one input character = one output character) and easy
 *    round-tripping.
 *  - Idempotent: `safeFilename(safeFilename(x)) === safeFilename(x)`.
 *  - Empty input returns empty string. Callers should defend against that
 *    (e.g., `safeFilename(name) || 'untitled'`).
 *
 * Used by T8 receipt download (`<RoomNumber>_<Period>.png`).
 */
export function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}
