import { OPENING_BOOK } from './openingBook.js';

export function detectOpening(moves) {
  if (!moves.length) return null;

  const keys = moves.map(m => m.from + m.to);

  // Try longest match first, then progressively shorter
  for (let len = keys.length; len > 0; len--) {
    const key = keys.slice(0, len).join(' ');
    const entry = OPENING_BOOK[key];
    if (entry) return entry; // { eco, name }
  }

  return null;
}
