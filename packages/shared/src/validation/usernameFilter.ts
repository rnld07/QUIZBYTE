import { BLOCKED_ANYWHERE, BLOCKED_WHOLE } from './blockedUsernames';

/**
 * Characters people reach for when a word is not allowed as it is written.
 *
 * Only the substitutions that actually turn up in names. Mapping every digit to
 * a letter would flatten "max2010" into a word and start inventing matches that
 * were never typed.
 */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '(': 'c',
  '€': 'e',
  '£': 'l',
};

/** German letters that people write out, so both spellings flatten the same. */
const EXPANSIONS: [RegExp, string][] = [
  [/ä/g, 'a'],
  [/ö/g, 'o'],
  [/ü/g, 'u'],
  [/ß/g, 'ss'],
];

/**
 * Boils a name down to the word somebody was trying to write.
 *
 * Five steps, in this order:
 *   1. lower case, and German umlauts written out;
 *   2. accents dropped, so "ñ" and "é" become "n" and "e";
 *   3. leetspeak read back – 4 to a, 3 to e, 1 to i, 0 to o and so on;
 *   4. everything that is not a letter thrown away, which takes the dots,
 *      underscores, spaces and leftover digits of "s.c.h.e.i.s.s.e" with it;
 *   5. runs of the same letter collapsed, so "fuuuck" is "fuck".
 *
 * The result is never shown to anyone and never stored – it exists only to be
 * compared against the list. The name itself is kept exactly as typed.
 */
export function flattenUsername(input: string): string {
  let value = input.toLowerCase();
  for (const [pattern, replacement] of EXPANSIONS) value = value.replace(pattern, replacement);

  // NFD splits "é" into "e" + accent; the range then drops the accents.
  value = value.normalize('NFD').replace(/[̀-ͯ]/g, '');

  value = [...value].map((character) => LEET[character] ?? character).join('');
  value = value.replace(/[^a-z]/g, '');

  // "aa" → "a". Applied last, so it works on what the steps above produced.
  return value.replace(/(.)\1+/g, '$1');
}

/**
 * Whether a name may not be used.
 *
 * Two rules, because one is not enough: the unambiguous terms are refused
 * wherever they appear, while the short and ambiguous ones are refused only
 * when the whole name comes down to them. "Klassenass" keeps its "ass";
 * "Arschloch" does not get to keep its "arschloch" by hiding in "xXarschlochXx".
 *
 * Kept identical to `username_is_blocked()` in SQL – see the migration.
 */
export function isBlockedUsername(input: string): boolean {
  const flat = flattenUsername(input);
  if (flat.length === 0) return false;

  if (BLOCKED_ANYWHERE.some((term) => flat.includes(term))) return true;
  return BLOCKED_WHOLE.includes(flat);
}
