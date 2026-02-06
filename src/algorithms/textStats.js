/**
 * Text statistics / counting algorithms.
 * Used by job processing (e.g. word count, character count).
 */

/**
 * Count words in text (split on whitespace, filter empty).
 */
export function countWords(text) {
  if (text == null || typeof text !== 'string') return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0).length;
}

/**
 * Count characters (including spaces).
 */
export function countCharacters(text) {
  if (text == null || typeof text !== 'string') return 0;
  return text.length;
}

/**
 * Count characters excluding whitespace.
 */
export function countCharactersNoSpaces(text) {
  if (text == null || typeof text !== 'string') return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * Count lines (split by newline).
 */
export function countLines(text) {
  if (text == null || typeof text !== 'string') return 0;
  const lines = text.split(/\r?\n/);
  return lines.length;
}

/**
 * Get full text statistics for a string.
 */
export function getTextStats(text) {
  return {
    words: countWords(text),
    characters: countCharacters(text),
    charactersNoSpaces: countCharactersNoSpaces(text),
    lines: countLines(text),
  };
}
