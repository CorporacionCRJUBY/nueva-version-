'use strict';

/**
 * Escape LIKE/NOT LIKE patterns for MySQL LIKE clauses.
 *
 * This utility is used by model "find by name/complaint" helpers to avoid
 * accidental wildcard interpretation of user-supplied search strings.
 *
 * NOTE: This is a light compatibility implementation. If the project later
 * introduces a database abstraction for LIKE escaping, prefer routing these
 * calls through that layer instead of duplicating DB-specific escaping here.
 */

const WILDCARDS = new Set(['%', '_', '\\']);

function escapeLike(value, escapeChar = '\\') {
  if (value == null) {
    return '';
  }

  const str = String(value);

  // Escape the escape character itself first, then the LIKE wildcards.
  return str
    .split('')
    .map((ch) => {
      if (ch === escapeChar) {
        return escapeChar + escapeChar;
      }
      if (ch === '%') {
        return escapeChar + '%';
      }
      if (ch === '_') {
        return escapeChar + '_';
      }
      if (ch === '\\') {
        return escapeChar + '\\';
      }
      return ch;
    })
    .join('');
}

module.exports = { escapeLike };
