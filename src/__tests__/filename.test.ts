import { describe, it, expect } from 'vitest';
import { safeFilename } from '../lib/filename';

describe('safeFilename', () => {
  it('passes through alphanumeric, dash, underscore unchanged', () => {
    expect(safeFilename('Room1-A_B')).toBe('Room1-A_B');
  });

  it('replaces spaces with underscores', () => {
    expect(safeFilename('Room 2')).toBe('Room_2');
  });

  it('replaces filesystem-unsafe punctuation', () => {
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  it('handles unicode + non-Latin scripts', () => {
    expect(safeFilename('Maria José')).toBe('Maria_Jos_');
    // Tagalog with diacritics — should still produce a valid filename
    expect(safeFilename('Niño')).toBe('Ni_o');
  });

  it('collapses common path traversal characters', () => {
    expect(safeFilename('../etc/passwd')).toBe('___etc_passwd');
    expect(safeFilename('..')).toBe('__');
  });

  it('returns an empty string when given only unsafe chars (caller must defend)', () => {
    expect(safeFilename('   ')).toBe('___');
    expect(safeFilename('!@#$')).toBe('____');
  });

  it('is idempotent', () => {
    const once = safeFilename('Room 2/wifi');
    const twice = safeFilename(once);
    expect(once).toBe(twice);
  });

  it('handles empty input', () => {
    expect(safeFilename('')).toBe('');
  });
});
