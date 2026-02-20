/**
 * Text processing: sort numbers, remove duplicates, clean trash.
 * Each operates line-by-line on file content.
 */

/**
 * Sort lines as numbers (asc or desc). Non-numeric lines are sorted as strings at the end.
 */
export function sortNumbers(content, options = {}) {
  if (content == null || typeof content !== 'string') return '';
  const order = (options.order || 'asc').toLowerCase();
  const lines = content.split(/\r?\n/);
  const numeric = [];
  const nonNumeric = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const num = parseFloat(trimmed);
    if (trimmed !== '' && !Number.isNaN(num)) {
      numeric.push(num);
    } else {
      nonNumeric.push(line);
    }
  }
  numeric.sort((a, b) => (order === 'desc' ? b - a : a - b));
  const numericLines = numeric.map(String);
  const sorted = [...numericLines, ...nonNumeric];
  return sorted.join('\n');
}

/**
 * Remove duplicate lines. Keeps first occurrence of each unique line.
 * options.caseSensitive (default false) for comparison.
 * Lines are trimmed before comparing so "one" and " one " count as the same.
 */
export function removeDuplicates(content, options = {}) {
  if (content == null || typeof content !== 'string') return '';
  const caseSensitive = !!options.caseSensitive;
  const lines = content.split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const key = caseSensitive ? trimmed : trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out.join('\n');
}

/**
 * Clean trash: remove empty lines, trim whitespace from each line.
 */
export function cleanTrash(content) {
  if (content == null || typeof content !== 'string') return '';
  const lines = content.split(/\r?\n/);
  const cleaned = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  return cleaned.join('\n');
}
