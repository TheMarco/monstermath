import { fracWords } from '../math/fractions';

/**
 * Which recorded clips say a number she sees on the screen. A number with its
 * own clip plays that one. The rest are built from a few pieces that meet at a
 * natural pause: "three hundred" then "forty-seven", "one" then "point two
 * five", "nine" then "fourths".
 */

/** Whole numbers up to here have a clip of their own. */
const OWN_CLIP = 200;
/** The biggest whole number that can be said. */
export const MAX_SAID = 9999;

const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Bottom numbers with a recorded word for the pieces: one "fourth", many "fourths". */
const PIECES: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  12: ['twelfth', 'twelfths'],
  16: ['sixteenth', 'sixteenths'],
  20: ['twentieth', 'twentieths'],
  100: ['hundredth', 'hundredths'],
};

/** A whole number from 0 to 9999: "two thousand", "three hundred", "forty-seven". */
export function wholeClips(n: number): string[] | null {
  if (!Number.isInteger(n) || n < 0 || n > MAX_SAID) return null;
  if (n <= OWN_CLIP) return [`n${n}`];
  const out: string[] = [];
  const thousands = Math.floor(n / 1000) * 1000;
  const below = n % 1000;
  if (thousands) out.push(`n${thousands}`);
  if (below > OWN_CLIP) {
    out.push(`n${Math.floor(below / 100) * 100}`);
    if (below % 100) out.push(`n${below % 100}`);
  } else if (below > 0) {
    out.push(`n${below}`);
  }
  return out;
}

/** A decimal with one or two digits after the point, as written: "0.47", "1.3", "2.50". */
export function decimalClips(whole: string, after: string): string[] | null {
  if (!/^\d{1,2}$/.test(after)) return null;
  const n = Number(whole);
  // "Zero point four seven" is one clip. Past one, the whole number comes first.
  if (n === 0) return [`d0_${after}`];
  const first = wholeClips(n);
  return first ? [...first, `p_${after}`] : null;
}

/** A fraction: "three fourths" when it has its own clip, else the top number and the word for the pieces. */
export function fractionClips(n: number, d: number): string[] | null {
  if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0) return null;
  if (fracWords({ n, d })) return [`f_${n}_${d}`];
  if (!PIECES[d]) return null;
  if (n === 1) return [`f_1_${d}`];
  const top = wholeClips(n);
  return top ? [...top, `fd_${d}`] : null;
}

export interface NumberToken {
  /** Where the number sits in the text. */
  start: number;
  end: number;
  clips: string[] | null;
}

const TOKEN = /(\d+)\/(\d+)|(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?/g;

/** Every number written in a piece of text, with the clips that say it. */
export function numberTokens(text: string): NumberToken[] {
  const out: NumberToken[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    let clips: string[] | null;
    if (m[1] !== undefined && m[2] !== undefined) clips = fractionClips(Number(m[1]), Number(m[2]));
    else {
      const whole = (m[3] ?? '').replace(/,/g, '');
      clips = m[4] !== undefined ? decimalClips(whole, m[4]) : wholeClips(Number(whole));
    }
    out.push({ start, end: start + m[0].length, clips });
  }
  return out;
}

const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/**
 * A number from 0 to 199 in words, for the recording script. Written as
 * digits, "103" gets read "one oh three"; a child needs "one hundred and three".
 */
export function numberWords(n: number): string {
  if (n >= 100) return n === 100 ? 'one hundred' : `one hundred and ${numberWords(n - 100)}`;
  if (n < 10) return DIGITS[n] as string;
  if (n < 20) return TEENS[n - 10] as string;
  return n % 10 ? `${TENS[Math.floor(n / 10)]}-${DIGITS[n % 10]}` : (TENS[n / 10] as string);
}

/** How a number is written in a line that gets recorded: digits up to 100, words above. */
export const spoken = (n: number): string => (n > 100 && n < 200 ? numberWords(n) : String(n));

export const capital = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** The clips this file adds to the recording script: key and the text to speak. */
export function numberRecordings(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let n = 300; n <= 900; n += 100) out.push([`n${n}`, `${n}.`]);
  for (let n = 1000; n <= 9000; n += 1000) out.push([`n${n}`, `${n}.`]);
  const after: string[] = [];
  for (let a = 0; a <= 9; a++) after.push(String(a));
  for (let a = 0; a <= 99; a++) after.push(String(a).padStart(2, '0'));
  for (const digits of after) {
    const words = [...digits].map((c) => DIGITS[Number(c)]).join(' ');
    out.push([`d0_${digits}`, `Zero point ${words}.`]);
    out.push([`p_${digits}`, `Point ${words}.`]);
  }
  for (const [bottom, [one, many]] of Object.entries(PIECES)) {
    out.push([`fd_${bottom}`, `${capital(many)}.`]);
    if (!fracWords({ n: 1, d: Number(bottom) })) out.push([`f_1_${bottom}`, `One ${one}.`]);
  }
  return out;
}
